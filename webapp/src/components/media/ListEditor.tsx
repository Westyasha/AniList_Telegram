import { useEffect, useState, type ReactNode } from "react";
import { Lock, Trash2 } from "lucide-react";
import type { CoverImage, ListEntry, MediaListStatus, MediaStatus, MediaTitle, MediaType, ScoreFormat } from "@/api/types";
import { useSaveEntry, useDeleteEntry } from "@/api/mutations";
import { useTitle, useViewer } from "@/api/session";
import { createStore, useStore } from "@/lib/store";
import { accentStyle } from "@/lib/color";
import { fuzzyToInput, inputToFuzzy } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { confirmAction, haptic } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import { Button, IconButton } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { ScoreInput } from "@/components/ui/ScoreInput";
import { Switch } from "@/components/ui/Switch";
import { Image } from "@/components/ui/Image";
import { LoginGate } from "@/components/auth/LoginGate";
import { LIST_STATUSES, STATUS_COLOR, statusLabel } from "./status";

export interface EditorMedia {
  id: number;
  type: MediaType;
  status: MediaStatus | null;
  episodes: number | null;
  chapters: number | null;
  volumes?: number | null;
  title: MediaTitle;
  coverImage: CoverImage;
  bannerImage: string | null;
}

export interface EditorTarget {
  media: EditorMedia;
  entry: ListEntry | null;
}

const editorStore = createStore<EditorTarget | null>(null);

export function openListEditor(target: EditorTarget): void {
  haptic.impact("light");
  editorStore.set(target);
}

function closeEditor(): void {
  editorStore.set(null);
}

interface FormState {
  status: MediaListStatus;
  progress: number;
  progressVolumes: number;
  score: number;
  startedAt: string;
  completedAt: string;
  repeat: number;
  notes: string;
  isPrivate: boolean;
}

function todayInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function initialForm({ media, entry }: EditorTarget): FormState {
  return {
    status: entry?.status ?? (media.status === "NOT_YET_RELEASED" ? "PLANNING" : "CURRENT"),
    progress: entry?.progress ?? 0,
    progressVolumes: entry?.progressVolumes ?? 0,
    score: entry?.score ?? 0,
    startedAt: fuzzyToInput(entry?.startedAt) || (entry ? "" : media.status === "NOT_YET_RELEASED" ? "" : todayInput()),
    completedAt: fuzzyToInput(entry?.completedAt),
    repeat: entry?.repeat ?? 0,
    notes: entry?.notes ?? "",
    isPrivate: entry?.private ?? false,
  };
}

export function ListEditorHost() {
  const target = useStore(editorStore);
  const [last, setLast] = useState<EditorTarget | null>(target);
  useEffect(() => {
    if (target) setLast(target);
  }, [target]);
  const shown = target ?? last;
  const t = useT();
  const title = useTitle();
  const viewer = useViewer();
  return (
    <Sheet
      open={Boolean(target)}
      onClose={closeEditor}
      title={shown ? title(shown.media.title) : t.list.editor.title}
      style={shown ? accentStyle(shown.media.coverImage.color) : undefined}
    >
      {shown && viewer && <EditorForm key={`${shown.media.id}-${shown.entry?.id ?? 0}`} target={shown} format={viewer.score_format} />}
      {shown && !viewer && <LoginGate compact />}
    </Sheet>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </div>
  );
}

function EditorForm({ target, format }: { target: EditorTarget; format: ScoreFormat }) {
  const t = useT();
  const { media, entry } = target;
  const [form, setForm] = useState<FormState>(() => initialForm(target));
  const save = useSaveEntry();
  const remove = useDeleteEntry();
  const isAnime = media.type === "ANIME";
  const max = isAnime ? media.episodes : media.chapters;

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const setStatus = (status: MediaListStatus) => {
    haptic.selection();
    const patch: Partial<FormState> = { status };
    if (status === "COMPLETED") {
      if (max) patch.progress = max;
      if (!form.completedAt) patch.completedAt = todayInput();
      if (!form.startedAt && !entry) patch.startedAt = todayInput();
    }
    if (status === "CURRENT" && !form.startedAt) patch.startedAt = todayInput();
    update(patch);
  };

  const setProgress = (progress: number) => {
    const patch: Partial<FormState> = { progress };
    if (max && progress >= max && (form.status === "CURRENT" || form.status === "REPEATING")) {
      patch.status = "COMPLETED";
      if (!form.completedAt) patch.completedAt = todayInput();
      if (form.status === "REPEATING") patch.repeat = form.repeat + 1;
    }
    if (progress > 0 && form.status === "PLANNING") patch.status = "CURRENT";
    if (progress > 0 && !form.startedAt) patch.startedAt = todayInput();
    update(patch);
  };

  const onSave = () => {
    save.mutate(
      {
        id: entry?.id,
        mediaId: media.id,
        status: form.status,
        progress: form.progress,
        progressVolumes: isAnime ? undefined : form.progressVolumes,
        scoreRaw: form.score,
        repeat: form.repeat,
        notes: form.notes,
        private: form.isPrivate,
        startedAt: inputToFuzzy(form.startedAt),
        completedAt: inputToFuzzy(form.completedAt),
      },
      {
        onSuccess: () => {
          haptic.notify("success");
          toast.success(t.list.editor.saved);
          closeEditor();
        },
      },
    );
  };

  const onDelete = async () => {
    if (!entry) return;
    const ok = await confirmAction(t.list.editor.deleteConfirm);
    if (!ok) return;
    remove.mutate(
      { id: entry.id, mediaId: media.id },
      {
        onSuccess: () => {
          haptic.notify("warning");
          toast.info(t.list.editor.deleted);
          closeEditor();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5 pt-1">
      <div className="relative -mx-5 -mt-1 flex items-end gap-3 overflow-hidden px-5 pt-3 pb-1">
        {media.bannerImage && (
          <Image
            src={media.bannerImage}
            alt=""
            className="absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
        )}
        <Image
          src={media.coverImage.medium ?? media.coverImage.large}
          alt=""
          color={media.coverImage.color}
          className="relative h-[72px] w-[50px] shrink-0 rounded-md ring-1 ring-white/10"
        />
        <div className="relative flex min-w-0 flex-wrap gap-1.5 pb-1">
          {entry?.private && (
            <span className="inline-flex h-6 items-center gap-1 rounded-md bg-surface-3 px-2 text-[11px] font-semibold text-muted">
              <Lock className="size-3" /> {t.list.editor.private}
            </span>
          )}
        </div>
      </div>

      <Field label={t.list.editor.status}>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t.list.editor.status}>
          {LIST_STATUSES.map((status) => {
            const active = form.status === status;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setStatus(status)}
                className={cn(
                  "flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[12.5px] font-semibold transition-colors",
                  active ? "border-transparent bg-surface-3 text-fg" : "border-line bg-surface-2 text-muted",
                )}
                style={active ? { boxShadow: `inset 0 0 0 1.5px ${STATUS_COLOR[status]}` } : undefined}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} aria-hidden />
                <span className="truncate">{statusLabel(t, media.type, status)}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <div className={cn("grid gap-3", isAnime ? "grid-cols-1" : "grid-cols-2")}>
        <Field label={isAnime ? t.list.editor.progress : t.list.editor.chapterProgress}>
          <Stepper value={form.progress} max={max} onChange={setProgress} label={t.list.editor.progress} />
        </Field>
        {!isAnime && (
          <Field label={t.list.editor.volumes}>
            <Stepper
              value={form.progressVolumes}
              max={media.volumes ?? null}
              onChange={(progressVolumes) => update({ progressVolumes })}
              label={t.list.editor.volumes}
            />
          </Field>
        )}
      </div>

      <Field label={t.list.editor.score}>
        <ScoreInput raw={form.score} format={format} onChange={(score) => update({ score })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <DateField label={t.list.editor.startDate} value={form.startedAt} onChange={(startedAt) => update({ startedAt })} />
        <DateField label={t.list.editor.finishDate} value={form.completedAt} onChange={(completedAt) => update({ completedAt })} />
      </div>

      <Field label={isAnime ? t.list.editor.rewatches : t.list.editor.rereads}>
        <Stepper value={form.repeat} onChange={(repeat) => update({ repeat })} label={t.list.editor.rewatches} />
      </Field>

      <Field label={t.list.editor.notes}>
        <textarea
          value={form.notes}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder={t.list.editor.notesPlaceholder}
          rows={3}
          className="min-h-[88px] w-full resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm outline-none placeholder:text-faint focus:border-line-strong"
        />
      </Field>

      <Switch
        checked={form.isPrivate}
        onChange={(isPrivate) => update({ isPrivate })}
        label={t.list.editor.private}
        hint={t.list.editor.privateHint}
      />

      <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-surface px-5 pt-3 pb-1">
        {entry && (
          <IconButton
            label={t.list.editor.delete}
            onClick={() => void onDelete()}
            className="size-12 rounded-xl bg-dropped/10 text-dropped hover:bg-dropped/20 hover:text-dropped"
            disabled={remove.isPending}
          >
            <Trash2 className="size-5" />
          </IconButton>
        )}
        <Button variant="primary" size="lg" block loading={save.isPending} onClick={onSave}>
          {t.common.save}
        </Button>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const t = useT();
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="date"
          value={value}
          max="2100-12-31"
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm font-semibold outline-none [color-scheme:dark] focus:border-line-strong"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-9 -translate-y-1/2 rounded px-1.5 text-[11px] font-semibold text-faint hover:text-fg"
          >
            {t.common.clear}
          </button>
        )}
      </div>
    </Field>
  );
}

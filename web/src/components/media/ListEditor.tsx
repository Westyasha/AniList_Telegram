"use client";

import { useState, type ReactNode } from "react";
import type { CoverImage, ListEntry, MediaListStatus, MediaStatus, MediaTitle, MediaType, NextAiringEpisode, ScoreFormat } from "@/api/types";
import { useDeleteEntry, useSaveEntry } from "@/api/mutations";
import { useTitle, useViewer } from "@/api/session";
import { createStore, useStore } from "@/lib/store";
import { fuzzyToInput, inputToFuzzy } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { airedUnits, totalUnits } from "@/lib/media";
import { LIST_STATUSES, STATUS_COLOR, statusLabel } from "@/lib/status";
import { confirmAction, haptic } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { Switch } from "@/components/ui/Switch";
import { LoginGate } from "@/components/shell/LoginGate";
import { Poster } from "./Poster";
import { ProgressTrack } from "./ProgressTrack";
import { ScoreInput } from "./ScoreInput";

export interface EditorMedia {
  id: number;
  type: MediaType;
  status: MediaStatus | null;
  episodes: number | null;
  chapters: number | null;
  volumes?: number | null;
  nextAiringEpisode: NextAiringEpisode | null;
  title: MediaTitle;
  coverImage: CoverImage;
}

export interface EditorTarget {
  media: EditorMedia;
  entry: ListEntry | null;
}

const editorStore = createStore<{ target: EditorTarget | null; open: boolean }>({ target: null, open: false });

export function openListEditor(target: EditorTarget): void {
  haptic.impact("light");
  editorStore.set({ target, open: true });
}

function closeEditor(): void {
  editorStore.set((prev) => ({ ...prev, open: false }));
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
  const upcoming = media.status === "NOT_YET_RELEASED";
  return {
    status: entry?.status ?? (upcoming ? "PLANNING" : "CURRENT"),
    progress: entry?.progress ?? 0,
    progressVolumes: entry?.progressVolumes ?? 0,
    score: entry?.score ?? 0,
    startedAt: fuzzyToInput(entry?.startedAt) || (entry || upcoming ? "" : todayInput()),
    completedAt: fuzzyToInput(entry?.completedAt),
    repeat: entry?.repeat ?? 0,
    notes: entry?.notes ?? "",
    isPrivate: entry?.private ?? false,
  };
}

export function ListEditorHost() {
  const { target, open } = useStore(editorStore);
  const t = useT();
  const title = useTitle();
  const viewer = useViewer();
  const label = target ? title(target.media.title) : t.list.editor.title;
  const formId = "list-editor-form";

  return (
    <Sheet
      open={open}
      onClose={closeEditor}
      label={label}
      leading={target ? <Poster src={target.media.coverImage.medium ?? target.media.coverImage.large} alt="" sizes="32px" chamfer="sm" className="w-8" /> : null}
      title={
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{label}</span>
          <span className="text-13 font-normal text-fg3">{t.list.editor.title}</span>
        </span>
      }
      footer={
        target && viewer ? (
          <Button variant="primary" block type="submit" form={formId}>
            {t.common.save}
          </Button>
        ) : undefined
      }
    >
      {target && viewer ? (
        <EditorForm key={`${target.media.id}-${target.entry?.id ?? 0}`} formId={formId} target={target} format={viewer.score_format} />
      ) : null}
      {target && !viewer ? <LoginGate compact /> : null}
    </Sheet>
  );
}

function Field({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-5 items-center justify-between gap-3">
        <span className="text-13 text-fg3">{label}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

function EditorForm({ target, format, formId }: { target: EditorTarget; format: ScoreFormat; formId: string }) {
  const t = useT();
  const { media, entry } = target;
  const [form, setForm] = useState<FormState>(() => initialForm(target));
  const save = useSaveEntry();
  const remove = useDeleteEntry();
  const isAnime = media.type === "ANIME";
  const max = totalUnits(media);
  const aired = airedUnits(media);

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
    if (!(await confirmAction(t.list.editor.deleteConfirm))) return;
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

  const progressLabel = isAnime ? t.list.editor.progress : t.list.editor.chapterProgress;

  return (
    <form
      id={formId}
      aria-busy={save.isPending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (!save.isPending) onSave();
      }}
      className="flex flex-col gap-6 pt-2"
    >
      <Field label={t.list.editor.status}>
        <div role="radiogroup" aria-label={t.list.editor.status} className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-line bg-line">
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
                  "flex h-11 min-w-0 items-center gap-2 px-3 text-left text-15 transition-colors duration-120",
                  active ? "bg-s3 font-medium text-fg" : "bg-s1 text-fg2 hover:bg-s2",
                )}
              >
                <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                <span className="truncate">{statusLabel(t, media.type, status)}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={progressLabel}>
        <Stepper value={form.progress} max={max} onChange={setProgress} label={progressLabel} />
        <ProgressTrack
          watched={form.progress}
          aired={aired}
          total={max}
          size="md"
          label={progressLabel}
          onSelect={setProgress}
          selectLabel={t.list.editor.setProgress}
        />
      </Field>

      {!isAnime ? (
        <Field label={t.list.editor.volumes}>
          <Stepper value={form.progressVolumes} max={media.volumes ?? null} onChange={(progressVolumes) => update({ progressVolumes })} label={t.list.editor.volumes} />
        </Field>
      ) : null}

      <Field label={t.list.editor.score}>
        <ScoreInput raw={form.score} format={format} onChange={(score) => update({ score })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <DateField label={t.list.editor.startDate} value={form.startedAt} onChange={(startedAt) => update({ startedAt })} />
        <DateField label={t.list.editor.finishDate} value={form.completedAt} onChange={(completedAt) => update({ completedAt })} />
      </div>

      <Field label={isAnime ? t.list.editor.rewatches : t.list.editor.rereads}>
        <Stepper value={form.repeat} onChange={(repeat) => update({ repeat })} label={isAnime ? t.list.editor.rewatches : t.list.editor.rereads} showMax={false} />
      </Field>

      <Field label={t.list.editor.notes}>
        <textarea
          value={form.notes}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder={t.list.editor.notesPlaceholder}
          aria-label={t.list.editor.notes}
          rows={3}
          className="min-h-24 w-full resize-none rounded-control border border-line bg-s2 px-3 py-2.5 text-15 text-fg outline-none placeholder:text-fg3 focus-visible:border-line-strong"
        />
      </Field>

      <Switch checked={form.isPrivate} onChange={(isPrivate) => update({ isPrivate })} label={t.list.editor.private} hint={t.list.editor.privateHint} />

      {entry ? (
        <div className="border-t border-line pt-2">
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => void onDelete()}
            className="h-11 text-15 text-fg2 transition-colors duration-120 hover:text-score-low disabled:text-fg3"
          >
            {t.list.editor.delete}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const t = useT();
  return (
    <Field
      label={label}
      aside={
        value ? (
          <button type="button" onClick={() => onChange("")} className="hit text-12 text-fg3 transition-colors hover:text-fg">
            {t.common.clear}
          </button>
        ) : null
      }
    >
      <input
        type="date"
        value={value}
        max="2100-12-31"
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="figure h-11 w-full min-w-0 rounded-control border border-line bg-s2 px-3 text-13 text-fg outline-none [color-scheme:dark] focus-visible:border-line-strong"
      />
    </Field>
  );
}

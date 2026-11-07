import { memo } from "react";
import { Link } from "react-router";
import { Pencil, Plus } from "lucide-react";
import type { CollectionEntry, ScoreFormat } from "@/api/types";
import { nextProgress, useIncrementProgress } from "@/api/mutations";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { Image } from "@/components/ui/Image";
import { ScoreDisplay } from "@/components/ui/ScoreInput";
import { openListEditor } from "@/components/media/ListEditor";
import { STATUS_COLOR, statusLabel } from "@/components/media/status";

interface EntryProps {
  entry: CollectionEntry;
  format: ScoreFormat;
  showStatus: boolean;
}

function useEntryActions(entry: CollectionEntry) {
  const t = useT();
  const title = useTitle()(entry.media.title);
  const increment = useIncrementProgress(({ completed, progress }) => {
    if (completed) toast.success(t.home.completed(title));
    else toast.success(entry.media.type === "ANIME" ? t.home.progressSaved(title, progress) : `${title}: ${t.common.ch(progress)}`);
  });
  const variables = nextProgress({ entry, media: entry.media });
  const canIncrement = Boolean(variables) && entry.status !== "COMPLETED";
  const edit = () => openListEditor({ media: entry.media, entry });
  return { title, increment, variables, canIncrement, edit };
}

export const LibraryRow = memo(function LibraryRow({ entry, format, showStatus }: EntryProps) {
  const t = useT();
  const { title, increment, variables, canIncrement, edit } = useEntryActions(entry);
  const max = entry.media.type === "ANIME" ? entry.media.episodes : entry.media.chapters;
  const progress = entry.progress ?? 0;
  const ratio = max ? Math.min(1, progress / max) : 0;
  const status = entry.status;

  return (
    <div className="cv-auto flex items-stretch gap-3 rounded-xl border border-line bg-surface p-2 pr-1.5">
      <Link to={`/media/${entry.media.id}`} className="shrink-0">
        <Image
          src={entry.media.coverImage.medium ?? entry.media.coverImage.large}
          alt=""
          color={entry.media.coverImage.color}
          className="h-[84px] w-[58px] rounded-md"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <Link to={`/media/${entry.media.id}`} className="min-w-0">
          <p className="line-clamp-2 text-[13px] leading-snug font-semibold">{title}</p>
        </Link>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[11.5px] font-semibold text-muted">
            {showStatus && status && (
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} aria-hidden />
                {statusLabel(t, entry.media.type, status)}
              </span>
            )}
            <span className="tabular">
              {progress}
              <span className="text-faint">/{max ?? "?"}</span>
            </span>
            <ScoreDisplay raw={entry.score} format={format} className="ml-auto text-[12px] text-fg" />
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${max ? ratio * 100 : progress > 0 ? 50 : 0}%`, background: status ? STATUS_COLOR[status] : "var(--color-watching)" }}
            />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col justify-between">
        <button
          type="button"
          aria-label={t.list.editor.title}
          onClick={edit}
          className="flex size-10 items-center justify-center rounded-lg text-faint hover:bg-white/5 hover:text-fg"
        >
          <Pencil className="size-4" />
        </button>
        {canIncrement && (
          <button
            type="button"
            aria-label="+1"
            disabled={increment.isPending}
            onClick={() => variables && increment.mutate(variables)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3 text-fg transition-transform active:scale-90 disabled:opacity-50"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
});

export const LibraryTile = memo(function LibraryTile({ entry, format }: EntryProps) {
  const { title, increment, variables, canIncrement, edit } = useEntryActions(entry);
  const max = entry.media.type === "ANIME" ? entry.media.episodes : entry.media.chapters;
  const progress = entry.progress ?? 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="relative">
        <Link to={`/media/${entry.media.id}`}>
          <Image
            src={entry.media.coverImage.large ?? entry.media.coverImage.medium}
            alt={title}
            color={entry.media.coverImage.color}
            className="aspect-[2/3] w-full rounded-[var(--radius-card)] ring-1 ring-white/5"
          />
        </Link>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 rounded-b-[var(--radius-card)] bg-gradient-to-t from-black/90 to-transparent p-1.5 pt-6">
          <button type="button" onClick={edit} className="tabular h-8 rounded-md px-1.5 text-[11.5px] font-bold text-white">
            {progress}/{max ?? "?"}
          </button>
          {canIncrement && (
            <button
              type="button"
              aria-label="+1"
              disabled={increment.isPending}
              onClick={() => variables && increment.mutate(variables)}
              className="flex size-8 items-center justify-center rounded-md bg-white/15 text-white backdrop-blur-sm active:scale-90"
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>
        {entry.status && (
          <span className="absolute top-2 left-2 size-2.5 rounded-full ring-2 ring-black/60" style={{ background: STATUS_COLOR[entry.status] }} aria-hidden />
        )}
        {(entry.score ?? 0) > 0 && (
          <span className="absolute top-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-white backdrop-blur-sm">
            <ScoreDisplay raw={entry.score} format={format} />
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-[12px] leading-[1.3] font-semibold">{title}</p>
    </div>
  );
});

import { useMemo } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useViewerCollection } from "@/api/hooks";
import { nextProgress, useIncrementProgress } from "@/api/mutations";
import { useTitle } from "@/api/session";
import type { CollectionEntry } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatCountdown } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { toast } from "@/lib/toast";
import { Image } from "@/components/ui/Image";
import { Section } from "@/components/ui/Section";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/media/ProgressRing";

function available(entry: CollectionEntry): number | null {
  const next = entry.media.nextAiringEpisode;
  if (next) return next.episode - 1;
  return entry.media.episodes;
}

export function ContinueWatching() {
  const t = useT();
  const { entries, isPending } = useViewerCollection("ANIME");

  const items = useMemo(
    () =>
      entries
        .filter((entry) => entry.status === "CURRENT" || entry.status === "REPEATING")
        .sort((a, b) => {
          const aBehind = (available(a) ?? 0) - (a.progress ?? 0) > 0 ? 1 : 0;
          const bBehind = (available(b) ?? 0) - (b.progress ?? 0) > 0 ? 1 : 0;
          return bBehind - aBehind || (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
        })
        .slice(0, 20),
    [entries],
  );

  if (!isPending && items.length === 0) return null;

  return (
    <Section title={t.home.continueWatching} to="/library?type=anime&status=CURRENT" bleed>
      {isPending ? (
        <RowSkeleton count={4} />
      ) : (
        <div className="scroll-row pb-1">
          {items.map((entry) => (
            <ContinueCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </Section>
  );
}

function ContinueCard({ entry }: { entry: CollectionEntry }) {
  const t = useT();
  const title = useTitle()(entry.media.title);
  const now = useNow(60_000);
  const progress = entry.progress ?? 0;
  const max = entry.media.episodes;
  const aired = available(entry);
  const behind = aired != null ? Math.max(0, aired - progress) : 0;
  const next = entry.media.nextAiringEpisode;
  const increment = useIncrementProgress(({ completed, progress: value }) => {
    if (completed) toast.success(t.home.completed(title));
    else toast.success(t.home.progressSaved(title, value));
  });
  const variables = nextProgress({ entry, media: entry.media });
  const caughtUp = aired != null && progress >= aired && next;

  return (
    <div className="flex w-[124px] flex-col gap-2">
      <Link to={`/media/${entry.media.id}`} className="relative block">
        <Image
          src={entry.media.coverImage.large}
          alt={title}
          color={entry.media.coverImage.color}
          className="aspect-[2/3] w-full rounded-[var(--radius-card)] ring-1 ring-white/5"
        />
        <div className="absolute right-1.5 bottom-1.5">
          <ProgressRing value={progress} max={max} size={38} color={entry.status === "REPEATING" ? "var(--color-repeating)" : "var(--color-watching)"} />
        </div>
        {behind > 0 && (
          <span className="tabular absolute top-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10.5px] font-bold text-white">
            +{behind}
          </span>
        )}
      </Link>
      <p className="line-clamp-2 min-h-[2.6em] text-[12.5px] leading-[1.3] font-semibold">{title}</p>
      <p className="tabular -mt-1 truncate text-[11px] font-semibold text-faint">
        {caughtUp && next ? t.media.nextEpisode(next.episode, formatCountdown(next.airingAt - now, t)) : `${progress}${max ? ` / ${max}` : ""}`}
      </p>
      <button
        type="button"
        disabled={!variables || increment.isPending}
        onClick={() => variables && increment.mutate(variables)}
        className="flex h-10 items-center justify-center gap-1 rounded-lg border border-line bg-surface-2 text-[12.5px] font-bold text-fg transition-[background,transform] hover:bg-surface-3 active:scale-95 disabled:opacity-40"
      >
        <Plus className="size-3.5" />
        {t.home.plusOne}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { memo } from "react";
import { Plus } from "lucide-react";
import type { CollectionEntry, ScoreFormat } from "@/api/types";
import { nextProgress, useIncrementProgress } from "@/api/mutations";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { airedUnits, totalUnits } from "@/lib/media";
import { statusLabel } from "@/lib/status";
import { toast } from "@/lib/toast";
import { IconButton } from "@/components/ui/Button";
import { openListEditor } from "./ListEditor";
import { StatusDot, UserScore } from "./Marks";
import { Poster } from "./Poster";
import { ProgressTrack } from "./ProgressTrack";

interface EntryRowProps {
  entry: CollectionEntry;
  format: ScoreFormat;
  showStatus?: boolean;
}

export const EntryRow = memo(function EntryRow({ entry, format, showStatus = false }: EntryRowProps) {
  const t = useT();
  const title = useTitle()(entry.media.title);
  const media = entry.media;
  const isAnime = media.type === "ANIME";
  const progress = entry.progress ?? 0;
  const total = totalUnits(media);
  const aired = airedUnits(media);
  const behind = aired != null ? Math.max(0, aired - progress) : 0;
  const increment = useIncrementProgress(({ completed, progress: value }) => {
    if (completed) toast.success(t.home.completed(title));
    else toast.success(isAnime ? t.home.progressSaved(title, value) : `${title}, ${t.common.ch(value)}`);
  });
  const variables = nextProgress({ entry, media });
  const canIncrement = Boolean(variables) && entry.status !== "COMPLETED";
  const unitLabel = isAnime ? t.list.editor.progress : t.list.editor.chapterProgress;

  return (
    <div className="cv-auto flex h-[92px] items-center gap-3 border-b border-line">
      <Link href={`/media/${media.id}`} tabIndex={-1} aria-hidden className="shrink-0">
        <Poster src={media.coverImage.large ?? media.coverImage.medium} alt="" sizes="48px" chamfer="sm" className="w-12" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link href={`/media/${media.id}`} className="truncate text-15 font-medium text-fg">
          {title}
        </Link>
        <button
          type="button"
          onClick={() => openListEditor({ media, entry })}
          aria-label={`${t.list.editor.title}: ${title}`}
          className="flex flex-col gap-2 text-left"
        >
          <span className="flex min-w-0 items-center gap-2 text-13 text-fg2">
            {showStatus && entry.status ? (
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <StatusDot status={entry.status} />
                {statusLabel(t, media.type, entry.status)}
              </span>
            ) : null}
            <span className="figure text-fg">
              {progress}
              <span className="text-fg3"> / {total ?? "?"}</span>
            </span>
            {behind > 0 && progress > 0 && entry.status !== "COMPLETED" ? <span className="text-fg2">{t.home.newEpisodes(behind)}</span> : null}
            <UserScore raw={entry.score} format={format} className="ml-auto text-13" />
          </span>
          <ProgressTrack watched={progress} aired={aired} total={total} label={unitLabel} />
        </button>
      </div>
      {canIncrement ? (
        <IconButton
          icon={Plus}
          label={t.library.plusOne(title)}
          outline
          disabled={increment.isPending}
          onClick={() => variables && increment.mutate(variables)}
        />
      ) : (
        <span aria-hidden className="w-11 shrink-0" />
      )}
    </div>
  );
});

"use client";

import Link from "next/link";
import { memo } from "react";
import type { MediaCard, MediaListStatus } from "@/api/types";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { formatCountdown, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { StatusDot } from "./Marks";
import { Poster } from "./Poster";
import { Figures } from "@/components/ui/Figures";

interface AiringRowProps {
  media: MediaCard;
  episode: number;
  airingAt: number;
  now: number;
  status: MediaListStatus | null;
}

const LIVE_WINDOW = 30 * 60;

export const AiringRow = memo(function AiringRow({ media, episode, airingAt, now, status }: AiringRowProps) {
  const t = useT();
  const title = useTitle()(media.title);
  const aired = airingAt <= now;
  const live = aired && now - airingAt < LIVE_WINDOW;
  const episodeText = media.episodes ? t.schedule.episodeOf(episode, media.episodes) : t.schedule.episode(episode);

  return (
    <li className="cv-auto">
      <Link href={`/media/${media.id}`} className="group flex h-16 items-center gap-3 border-b border-line">
        <span className={cn("figure w-12 shrink-0 text-15", aired && !live ? "text-fg3" : "text-fg")}>{formatTime(airingAt, t.locale)}</span>
        <Poster src={media.coverImage.medium ?? media.coverImage.large} alt="" sizes="32px" chamfer="sm" className={cn("w-8", aired && !live && "opacity-60")} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("truncate text-15", aired && !live ? "text-fg2" : "text-fg")}>{title}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-13 text-fg3">
            {status ? <StatusDot status={status} /> : null}
            <span className="truncate">
              <Figures text={episodeText} />
            </span>
          </span>
        </span>
        <span className="shrink-0 text-right text-13">
          {live ? (
            <span className="inline-flex items-center gap-1.5 text-accent-ink">
              <span aria-hidden className="size-1.5 animate-live rounded-full bg-accent" />
              {t.home.airingNow}
            </span>
          ) : aired ? (
            <span className="text-fg3">{t.home.aired}</span>
          ) : (
            <span className="figure text-fg2">{formatCountdown(airingAt - now, t)}</span>
          )}
        </span>
      </Link>
    </li>
  );
});

"use client";

import Link from "next/link";
import { memo } from "react";
import type { MediaCard } from "@/api/types";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { coverOf } from "@/lib/media";
import { cn } from "@/lib/cn";
import { useListIndex } from "./ListIndex";
import { AverageScore, StatusDot } from "./Marks";
import { Poster } from "./Poster";

interface PosterCardProps {
  media: MediaCard;
  caption?: string;
  sizes?: string;
  className?: string;
  preload?: boolean;
}

export const PosterCard = memo(function PosterCard({ media, caption, sizes = "120px", className, preload = false }: PosterCardProps) {
  const t = useT();
  const title = useTitle()(media.title);
  const status = useListIndex().statusOf(media.id);
  const year = media.seasonYear ?? media.startDate.year;
  const meta = caption ?? [media.format ? t.enums.format[media.format] : null, year].filter(Boolean).join(", ");

  return (
    <Link href={`/media/${media.id}`} className={cn("group flex min-w-0 flex-col gap-2", className)}>
      <Poster src={coverOf(media)} alt={title} sizes={sizes} preload={preload} className="transition-transform duration-120 group-active:scale-[0.98]" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-13 font-medium text-fg">{title}</span>
        <span className="flex min-w-0 items-center gap-2 text-12 text-fg3">
          {status ? <StatusDot status={status} /> : null}
          {!caption ? <AverageScore value={media.averageScore} /> : null}
          <span className="truncate">{meta}</span>
        </span>
      </span>
    </Link>
  );
});

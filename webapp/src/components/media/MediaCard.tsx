import { memo } from "react";
import { Link } from "react-router";
import type { MediaCard as MediaCardData } from "@/api/types";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { scoreTone } from "@/lib/score";
import { cn } from "@/lib/cn";
import { Image } from "@/components/ui/Image";
import { useListIndex } from "./ListIndex";
import { STATUS_COLOR, statusLabel } from "./status";

interface MediaCardProps {
  media: MediaCardData;
  caption?: string;
  className?: string;
  eager?: boolean;
  showMeta?: boolean;
}

export const MediaCard = memo(function MediaCard({ media, caption, className, eager, showMeta = true }: MediaCardProps) {
  const t = useT();
  const title = useTitle()(media.title);
  const status = useListIndex().statusOf(media.id);
  const year = media.seasonYear ?? media.startDate.year;
  const meta = caption ?? [media.format ? t.enums.format[media.format] : null, year].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/media/${media.id}`}
      className={cn("group flex min-w-0 flex-col gap-2 rounded-[var(--radius-card)] outline-offset-4", className)}
    >
      <div className="relative">
        <Image
          src={media.coverImage.large ?? media.coverImage.medium}
          alt={title}
          color={media.coverImage.color}
          eager={eager}
          className="aspect-[2/3] w-full rounded-[var(--radius-card)] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.9)] ring-1 ring-white/5 transition-transform duration-200 group-active:scale-[0.97]"
        />
        {media.averageScore != null && (
          <span
            className="tabular absolute top-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold backdrop-blur-sm"
            style={{ color: scoreTone(media.averageScore) }}
          >
            {media.averageScore}%
          </span>
        )}
        {status && (
          <span
            className="absolute top-2 left-2 size-2.5 rounded-full ring-2 ring-black/60"
            style={{ background: STATUS_COLOR[status] }}
            title={statusLabel(t, media.type, status)}
            aria-label={statusLabel(t, media.type, status)}
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[12.5px] leading-[1.3] font-semibold text-fg/90 group-hover:text-fg">{title}</p>
        {showMeta && meta && <p className="mt-0.5 truncate text-[11px] font-semibold text-faint">{meta}</p>}
      </div>
    </Link>
  );
});

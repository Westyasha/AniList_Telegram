"use client";

import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import type { ImageSet } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Poster } from "@/components/media/Poster";
import { RichText } from "@/components/media/RichText";
import { BackButton } from "@/components/shell/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { DefinitionList, type Definition } from "@/components/ui/DefinitionList";
import { isTelegram } from "@/lib/telegram";

interface PersonViewProps {
  name: string;
  native: string | null;
  alternative: string[];
  image: ImageSet;
  favourites: number | null;
  isFavourite: boolean;
  onFavourite: () => void;
  rows: Definition[];
  description: string | null;
  children: ReactNode;
}

export function PersonView({ name, native, alternative, image, favourites, isFavourite, onFavourite, rows, description, children }: PersonViewProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-8">
      <div className="pt-safe">
        <div className="flex min-h-16 items-center px-4 pt-2">{!isTelegram() ? <BackButton className="-ml-3" /> : null}</div>
        <div className="flex items-end gap-4 px-4">
          <Poster src={image.large ?? image.medium} alt={name} sizes="112px" preload className="w-28 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="line-clamp-3 text-20 font-semibold text-fg">{name}</h1>
            {native ? <p className="truncate text-13 text-fg2">{native}</p> : null}
            {alternative.length > 0 ? <p className="line-clamp-2 text-13 text-fg3">{alternative.join(", ")}</p> : null}
            <button
              type="button"
              aria-pressed={isFavourite}
              aria-label={isFavourite ? t.media.unfavourite : t.media.favourite}
              onClick={onFavourite}
              className={cn(
                "mt-2 inline-flex h-11 w-fit items-center gap-2 rounded-control border border-line bg-s2 px-3 transition-colors duration-120 hover:bg-s3",
                isFavourite ? "text-accent-ink" : "text-fg2",
              )}
            >
              <Icon icon={Heart} filled={isFavourite} />
              <span className="figure text-13">{formatNumber(favourites, t.locale)}</span>
            </button>
          </div>
        </div>
      </div>
      {rows.some(([, value]) => value) ? (
        <div className="px-4">
          <DefinitionList rows={rows} />
        </div>
      ) : null}
      {description ? (
        <div className="px-4">
          <RichText source={description} collapsedLines={6} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function PersonSkeleton() {
  return (
    <div aria-busy className="pt-safe">
      <div className="min-h-16" />
      <div className="flex items-end gap-4 px-4">
        <Skeleton className="chamfer aspect-[2/3] w-28 shrink-0 rounded-poster" />
        <div className="flex flex-1 flex-col gap-2 pb-1">
          <Skeleton className="h-5 w-3/4 rounded-[2px]" />
          <Skeleton className="h-3 w-1/2 rounded-[2px]" />
          <Skeleton className="mt-2 h-11 w-20 rounded-control" />
        </div>
      </div>
    </div>
  );
}

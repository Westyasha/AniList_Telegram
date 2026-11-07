import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import type { ImageSet } from "@/api/types";
import { useI18n } from "@/lib/i18n";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Banner } from "@/components/media/Banner";
import { Image } from "@/components/ui/Image";
import { Card, InfoRow } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";

interface PersonHeaderProps {
  name: string;
  native: string | null;
  alternative: string[];
  image: ImageSet;
  favourites: number | null;
  isFavourite: boolean;
  onFavourite: () => void;
}

export function PersonHeader({ name, native, alternative, image, favourites, isFavourite, onFavourite }: PersonHeaderProps) {
  const { t } = useI18n();
  return (
    <div>
      <Banner src={null} fallback={image.large} height={150} />
      <div className="relative z-10 -mt-[96px] flex gap-4 px-4">
        <Image
          src={image.large}
          placeholder={image.medium}
          alt={name}
          eager
          className="aspect-[2/3] w-[112px] shrink-0 rounded-xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-end pb-1">
          <h1 className="line-clamp-3 text-[20px] leading-tight font-extrabold tracking-[-0.015em]">{name}</h1>
          {native && <p className="mt-1 truncate text-[13px] font-semibold text-muted">{native}</p>}
          {alternative.length > 0 && <p className="mt-1 line-clamp-2 text-[11.5px] font-semibold text-faint">{alternative.join(", ")}</p>}
          <button
            type="button"
            aria-pressed={isFavourite}
            onClick={onFavourite}
            className={cn(
              "mt-3 inline-flex h-10 w-fit items-center gap-2 rounded-xl border px-3.5 text-[13px] font-bold transition-colors",
              isFavourite ? "border-[#FB7185]/30 bg-[#FB7185]/12 text-[#FB7185]" : "border-line bg-surface-2 text-muted hover:text-fg",
            )}
          >
            <Heart className={cn("size-4", isFavourite && "fill-current")} />
            <span className="tabular">{formatCompact(favourites, t.locale)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function PersonInfo({ rows }: { rows: [string, ReactNode][] }) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (visible.length === 0) return null;
  return (
    <div className="px-4">
      <Card>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
          {visible.map(([label, value]) => (
            <InfoRow key={label} label={label}>
              {value}
            </InfoRow>
          ))}
        </dl>
      </Card>
    </div>
  );
}

export function PersonSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="h-[calc(150px+var(--safe-top))] w-full rounded-none" />
      <div className="-mt-[96px] flex gap-4 px-4">
        <Skeleton className="aspect-[2/3] w-[112px] shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col justify-end gap-2 pb-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="mt-2 h-10 w-20 rounded-xl" />
        </div>
      </div>
      <div className="mt-6 px-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}

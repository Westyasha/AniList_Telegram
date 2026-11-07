"use client";

import Link from "next/link";
import { useTitle } from "@/api/session";
import type { MediaCard } from "@/api/types";
import { useT } from "@/lib/i18n";
import { Poster } from "@/components/media/Poster";
import { AverageScore } from "@/components/media/Marks";

const GRID = 8;

interface ShelfProps {
  title: string;
  items: MediaCard[];
  accent: string;
}

export function FavouriteShelf({ title, items, accent }: ShelfProps) {
  const t = useT();
  const name = useTitle();
  if (items.length === 0) return null;
  const [top, ...rest] = items;
  const grid = rest.slice(0, GRID);
  const hidden = rest.length - grid.length;
  const year = top.seasonYear ?? top.startDate?.year;
  const meta = [top.format ? t.enums.format[top.format] : null, year ? String(year) : null].filter(Boolean).join(" · ");

  return (
    <section className="flex flex-col gap-4 px-4" aria-label={title}>
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-17 font-semibold text-fg">{title}</h2>
        <span className="figure text-13 text-fg3">{items.length}</span>
      </header>

      <Link href={`/media/${top.id}`} className="group grid grid-cols-[152px_1fr] items-end gap-4">
        <Poster src={top.coverImage.extraLarge ?? top.coverImage.large} alt={name(top.title)} sizes="152px" preload />
        <div className="flex min-w-0 flex-col gap-2 pb-1">
          <span className="flex items-center gap-2 text-12 text-fg3">
            <span aria-hidden className="size-0 border-t-[6px] border-r-[6px] border-t-transparent" style={{ borderRightColor: accent }} />
            {t.profile.topFavourite}
          </span>
          <span className="line-clamp-4 text-20 leading-tight font-semibold text-fg transition-colors group-hover:text-fg2">{name(top.title)}</span>
          <span className="flex items-center gap-2 text-13 text-fg2">
            {meta}
            <AverageScore value={top.averageScore} />
          </span>
        </div>
      </Link>

      {grid.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {grid.map((media) => (
            <li key={media.id}>
              <Link href={`/media/${media.id}`} aria-label={name(media.title)} className="block transition-opacity hover:opacity-85">
                <Poster src={media.coverImage.large ?? media.coverImage.medium} alt="" sizes="88px" chamfer="sm" />
              </Link>
            </li>
          ))}
          {hidden > 0 ? (
            <li className="col-span-4 pt-1 text-13 text-fg3">
              <span className="figure">+{hidden}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}

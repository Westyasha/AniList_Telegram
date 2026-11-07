"use client";

import type { ReactNode } from "react";
import type { MediaCard } from "@/api/types";
import { useT } from "@/lib/i18n";
import { Section } from "@/components/ui/Section";
import { PosterSkeleton } from "@/components/ui/Skeleton";
import { PosterCard } from "./PosterCard";

interface PosterRowProps {
  title: ReactNode;
  aside?: ReactNode;
  items: MediaCard[] | undefined;
  loading?: boolean;
  href?: string;
  captions?: (media: MediaCard) => string | undefined;
}

export function PosterRow({ title, aside, items, loading = false, href, captions }: PosterRowProps) {
  const t = useT();
  const visible = (items ?? []).filter((media) => !media.isAdult);
  if (!loading && visible.length === 0) return null;
  return (
    <Section title={title} aside={aside} href={href} hrefLabel={t.common.seeAll} bleed>
      <div className="scroll-row">
        {loading
          ? Array.from({ length: 4 }, (_, index) => <PosterSkeleton key={index} className="w-[120px]" />)
          : visible.map((media) => <PosterCard key={media.id} media={media} caption={captions?.(media)} className="w-[120px]" />)}
      </div>
    </Section>
  );
}

export function PosterGrid({ items, captions }: { items: MediaCard[]; captions?: (media: MediaCard) => string | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
      {items.map((media) => (
        <PosterCard key={media.id} media={media} caption={captions?.(media)} sizes="(max-width: 560px) 33vw, 140px" />
      ))}
    </div>
  );
}

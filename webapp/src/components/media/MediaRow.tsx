import type { ReactNode } from "react";
import type { MediaCard as MediaCardData } from "@/api/types";
import { Section } from "@/components/ui/Section";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { MediaCard } from "./MediaCard";

interface MediaRowProps {
  title: ReactNode;
  items: MediaCardData[] | undefined;
  loading?: boolean;
  to?: string;
  captions?: (media: MediaCardData) => string | undefined;
}

export function MediaRow({ title, items, loading, to, captions }: MediaRowProps) {
  if (!loading && (!items || items.length === 0)) return null;
  return (
    <Section title={title} to={to} bleed>
      {loading || !items ? (
        <RowSkeleton />
      ) : (
        <div className="scroll-row pb-1">
          {items.map((media) => (
            <MediaCard key={media.id} media={media} caption={captions?.(media)} className="w-[118px]" />
          ))}
        </div>
      )}
    </Section>
  );
}

export function CoverGrid({ items, captions }: { items: MediaCardData[]; captions?: (media: MediaCardData) => string | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
      {items.map((media) => (
        <MediaCard key={media.id} media={media} caption={captions?.(media)} />
      ))}
    </div>
  );
}

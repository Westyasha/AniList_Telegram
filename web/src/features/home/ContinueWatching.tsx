"use client";

import { useMemo } from "react";
import { useViewerCollection } from "@/api/hooks";
import { useViewer } from "@/api/session";
import type { CollectionEntry } from "@/api/types";
import { useT } from "@/lib/i18n";
import { airedUnits } from "@/lib/media";
import { Section } from "@/components/ui/Section";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { EntryRow } from "@/components/media/EntryRow";

function behind(entry: CollectionEntry): number {
  const aired = airedUnits(entry.media);
  return aired == null ? 0 : Math.max(0, aired - (entry.progress ?? 0));
}

export function ContinueWatching() {
  const t = useT();
  const viewer = useViewer();
  const { entries, isPending } = useViewerCollection("ANIME");

  const items = useMemo(
    () =>
      entries
        .filter((entry) => entry.status === "CURRENT" || entry.status === "REPEATING")
        .map((entry) => ({ entry, behind: behind(entry) }))
        .sort((a, b) => Number(b.behind > 0) - Number(a.behind > 0) || (b.entry.updatedAt ?? 0) - (a.entry.updatedAt ?? 0))
        .slice(0, 4)
        .map(({ entry }) => entry),
    [entries],
  );

  if (!viewer || (!isPending && items.length === 0)) return null;

  return (
    <Section title={t.home.continueWatching} href="/library?status=CURRENT" hrefLabel={t.common.seeAll} bleed>
      {isPending ? (
        <RowsSkeleton count={3} height={92} />
      ) : (
        <div className="px-4 [&>*:last-child]:border-b-0">
          {items.map((entry) => (
            <EntryRow key={entry.id} entry={entry} format={viewer.score_format} />
          ))}
        </div>
      )}
    </Section>
  );
}

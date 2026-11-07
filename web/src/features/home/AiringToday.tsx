"use client";

import { useMemo } from "react";
import type { AiringSchedule } from "@/api/types";
import { useT } from "@/lib/i18n";
import { useNow } from "@/lib/hooks";
import { Section } from "@/components/ui/Section";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { useListIndex } from "@/components/media/ListIndex";
import { AiringRow } from "@/components/media/AiringRow";

const LIMIT = 6;

export function AiringToday({ items, loading }: { items: AiringSchedule[] | undefined; loading: boolean }) {
  const t = useT();
  const now = useNow(30_000);
  const index = useListIndex();

  const visible = useMemo(() => {
    const list = (items ?? []).filter((item) => item.media && !item.media.isAdult);
    const firstUpcoming = list.findIndex((item) => item.airingAt > now - 30 * 60);
    const start = firstUpcoming === -1 ? Math.max(0, list.length - LIMIT) : Math.max(0, Math.min(firstUpcoming - 1, list.length - LIMIT));
    return list.slice(start, start + LIMIT);
  }, [items, now]);

  return (
    <Section title={t.home.airingToday} href="/schedule" hrefLabel={t.home.fullSchedule} bleed>
      {loading ? (
        <RowsSkeleton count={4} height={64} />
      ) : visible.length === 0 ? (
        <p className="px-4 text-15 text-fg2">{t.home.noAiring}</p>
      ) : (
        <ol className="px-4 [&>*:last-child>a]:border-b-0">
          {visible.map((item) => {
            const entry = index.get(item.media.id);
            return (
              <AiringRow
                key={item.id}
                media={item.media}
                episode={item.episode}
                airingAt={item.airingAt}
                now={now}
                status={entry?.status ?? null}
              />
            );
          })}
        </ol>
      )}
    </Section>
  );
}

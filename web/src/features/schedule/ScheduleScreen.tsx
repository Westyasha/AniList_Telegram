"use client";

import { useEffect, useMemo, useState } from "react";
import { useSchedule } from "@/api/hooks";
import { useViewer } from "@/api/session";
import type { ScheduleEntry } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatDayMonth, formatWeekday } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { dayBounds, weekFrom } from "@/lib/season";
import { readLocal, writeLocal } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useQueryParams } from "@/lib/useQueryParams";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/shell/PageHeader";
import { Facet } from "@/components/brand/Mark";
import { Switch } from "@/components/ui/Switch";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { useListIndex } from "@/components/media/ListIndex";
import { AiringRow } from "@/components/media/AiringRow";

interface HourGroup {
  hour: number;
  items: ScheduleEntry[];
}

function groupByHour(items: ScheduleEntry[]): HourGroup[] {
  const groups: HourGroup[] = [];
  for (const item of items) {
    const hour = new Date(item.airingAt * 1000).getHours();
    const last = groups[groups.length - 1];
    if (last && last.hour === hour) last.items.push(item);
    else groups.push({ hour, items: [item] });
  }
  return groups;
}

function hourLabel(hour: number, locale: string): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

export function ScheduleScreen() {
  const t = useT();
  const viewer = useViewer();
  const { params, update } = useQueryParams();
  const days = useMemo(() => weekFrom(new Date()), []);
  const dayIndex = Math.min(6, Math.max(0, Number(params.get("day") ?? 0) || 0));
  const day = days[dayIndex];
  const { from, to } = useMemo(() => dayBounds(day), [day]);
  const [onlyMine, setOnlyMine] = useState(() => readLocal("schedule.onlyMine", false));
  const { items, isPending, isError, error, refetch, isFetchingNextPage } = useSchedule(from, to);
  const index = useListIndex();
  const now = useNow(30_000);

  useEffect(() => writeLocal("schedule.onlyMine", onlyMine), [onlyMine]);

  const groups = useMemo(() => {
    const visible = viewer && onlyMine ? items.filter((item) => item.media.mediaListEntry || index.statusOf(item.media.id)) : items;
    return groupByHour(visible);
  }, [items, onlyMine, viewer, index]);

  const heading = dayIndex === 0 ? t.schedule.today : dayIndex === 1 ? t.schedule.tomorrow : formatWeekday(day, t.locale, "long");

  return (
    <div>
      <PageHeader title={t.schedule.title} />
      <div role="tablist" aria-label={t.schedule.title} className="grid grid-cols-7 border-b border-line px-2">
        {days.map((date, position) => {
          const active = position === dayIndex;
          return (
            <button
              key={date.toISOString()}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${formatWeekday(date, t.locale, "long")}, ${formatDayMonth(date, t.locale)}`}
              onClick={() => {
                if (active) return;
                haptic.selection();
                update({ day: position === 0 ? null : String(position) });
              }}
              className={cn("relative flex h-16 flex-col items-center justify-center gap-0.5 transition-colors duration-120", active ? "text-fg" : "text-fg3 hover:text-fg2")}
            >
              <span className="text-12 first-letter:uppercase">{formatWeekday(date, t.locale)}</span>
              <span className={cn("figure text-17", active && "font-medium")}>{date.getDate()}</span>
              <span aria-hidden className={cn("absolute inset-x-0 bottom-0 flex justify-center transition-opacity duration-120", active ? "opacity-100" : "opacity-0")}>
                <Facet direction="up" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-3 px-4 pt-6">
        <h2 className="text-17 font-semibold text-fg first-letter:uppercase">
          {heading}
          <span className="ml-2 text-13 font-normal text-fg3">{formatDayMonth(day, t.locale)}</span>
        </h2>
      </div>
      {viewer ? (
        <div className="px-4">
          <Switch checked={onlyMine} onChange={setOnlyMine} label={t.schedule.onlyMine} />
        </div>
      ) : null}

      <div className="mt-2">
        {isPending ? (
          <RowsSkeleton count={8} height={64} />
        ) : isError && items.length === 0 ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : groups.length === 0 ? (
          <EmptyState title={onlyMine && viewer ? t.schedule.emptyMine : t.schedule.empty} />
        ) : (
          <div className="flex flex-col gap-4 px-4">
            {groups.map((group) => (
              <section key={group.hour} aria-label={hourLabel(group.hour, t.locale)}>
                <h3 className="figure flex h-8 items-center text-12 text-fg3">{hourLabel(group.hour, t.locale)}</h3>
                <ol className="border-t border-line">
                  {group.items.map((item) => (
                    <AiringRow
                      key={item.id}
                      media={item.media}
                      episode={item.episode}
                      airingAt={item.airingAt}
                      now={now}
                      status={item.media.mediaListEntry?.status ?? index.statusOf(item.media.id)}
                    />
                  ))}
                </ol>
              </section>
            ))}
            {isFetchingNextPage ? <RowsSkeleton count={2} height={64} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}

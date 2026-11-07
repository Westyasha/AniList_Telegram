import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CalendarX2 } from "lucide-react";
import { useSchedule } from "@/api/hooks";
import { useTitle, useViewer } from "@/api/session";
import type { MediaListStatus, ScheduleEntry } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatCountdown, formatDayMonth, formatTime, formatWeekday } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { dayBounds, weekFrom } from "@/lib/season";
import { readLocal, writeLocal } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Image } from "@/components/ui/Image";
import { Switch } from "@/components/ui/Switch";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useListIndex } from "@/components/media/ListIndex";
import { STATUS_COLOR, statusLabel } from "@/components/media/status";

export function SchedulePage() {
  const t = useT();
  const viewer = useViewer();
  const [params, setParams] = useSearchParams();
  const days = useMemo(() => weekFrom(new Date()), []);
  const dayIndex = Math.min(6, Math.max(0, Number(params.get("day") ?? 0) || 0));
  const day = days[dayIndex];
  const { from, to } = useMemo(() => dayBounds(day), [day]);
  const [onlyMine, setOnlyMine] = useState(() => readLocal("schedule.onlyMine", false));
  const { items, isPending, isError, error, refetch, isFetchingNextPage } = useSchedule(from, to);
  const index = useListIndex();

  useEffect(() => writeLocal("schedule.onlyMine", onlyMine), [onlyMine]);

  const visible = useMemo(() => {
    if (!viewer || !onlyMine) return items;
    return items.filter((item) => item.media.mediaListEntry || index.statusOf(item.media.id));
  }, [items, onlyMine, viewer, index]);

  const selectDay = (next: number) => {
    haptic.selection();
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        if (next === 0) nextParams.delete("day");
        else nextParams.set("day", String(next));
        return nextParams;
      },
      { replace: true },
    );
  };

  return (
    <div>
      <PageHeader title={t.schedule.title} />
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-1" role="tablist">
        {days.map((date, position) => {
          const active = position === dayIndex;
          return (
            <button
              key={date.toISOString()}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectDay(position)}
              className={cn(
                "flex h-[62px] min-w-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors",
                active ? "border-transparent bg-primary text-white" : "border-line bg-surface text-muted hover:text-fg",
              )}
            >
              <span className={cn("text-[10.5px] font-semibold uppercase", active ? "text-white/80" : "text-faint")}>
                {position === 0 ? t.schedule.today : formatWeekday(date, t.locale)}
              </span>
              <span className="tabular text-[17px] font-extrabold">{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <p className="text-sm font-bold">
          {dayIndex === 1 ? t.schedule.tomorrow : formatWeekday(day, t.locale, "long")}
          <span className="ml-2 text-xs font-semibold text-faint">{formatDayMonth(day, t.locale)}</span>
        </p>
      </div>
      {viewer && (
        <div className="px-4">
          <Switch checked={onlyMine} onChange={setOnlyMine} label={t.schedule.onlyMine} />
        </div>
      )}

      <div className="mt-2">
        {isPending ? (
          <ListSkeleton count={8} />
        ) : isError && items.length === 0 ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<CalendarX2 className="size-6" />} title={onlyMine && viewer ? t.schedule.emptyMine : t.schedule.empty} />
        ) : (
          <ol className="flex flex-col gap-2 px-4">
            {visible.map((item) => (
              <ScheduleRow key={item.id} item={item} statusFromIndex={index.statusOf(item.media.id)} />
            ))}
            {isFetchingNextPage && <ListSkeleton count={2} />}
          </ol>
        )}
      </div>
    </div>
  );
}

function ScheduleRow({ item, statusFromIndex }: { item: ScheduleEntry; statusFromIndex: MediaListStatus | null }) {
  const t = useT();
  const title = useTitle()(item.media.title);
  const now = useNow(30_000);
  const aired = item.airingAt <= now;
  const status = item.media.mediaListEntry?.status ?? statusFromIndex;
  const progress = item.media.mediaListEntry?.progress;

  return (
    <li className="cv-auto">
      <Link
        to={`/media/${item.media.id}`}
        className={cn("flex items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-3 transition-colors hover:bg-surface-2", aired && "opacity-70")}
      >
        <div className="tabular flex w-11 shrink-0 flex-col items-center">
          <span className="text-[13px] font-bold">{formatTime(item.airingAt, t.locale)}</span>
        </div>
        <Image
          src={item.media.coverImage.medium ?? item.media.coverImage.large}
          alt=""
          color={item.media.coverImage.color}
          className="h-[70px] w-[48px] shrink-0 rounded-md"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] leading-snug font-semibold">{title}</p>
          <p className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-muted">
            <span>
              {t.schedule.episode(item.episode)}
              {item.media.episodes ? <span className="text-faint"> / {item.media.episodes}</span> : null}
            </span>
            {status && (
              <span className="inline-flex items-center gap-1 truncate">
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} aria-hidden />
                <span className="truncate">
                  {statusLabel(t, item.media.type, status)}
                  {progress != null && progress > 0 ? ` · ${progress}` : ""}
                </span>
              </span>
            )}
          </p>
        </div>
        <span
          className={cn(
            "tabular shrink-0 rounded-md px-2 py-1 text-[11px] font-bold",
            aired ? "bg-surface-3 text-faint" : "bg-primary/12 text-primary-hover",
          )}
        >
          {aired ? t.schedule.aired : formatCountdown(item.airingAt - now, t)}
        </span>
      </Link>
    </li>
  );
}

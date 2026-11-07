import { Link } from "react-router";
import type { AiringSchedule } from "@/api/types";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { formatCountdown, formatTime } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { Image } from "@/components/ui/Image";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { useListIndex } from "@/components/media/ListIndex";
import { STATUS_COLOR } from "@/components/media/status";

export function AiringToday({ items, loading }: { items: AiringSchedule[] | undefined; loading: boolean }) {
  const t = useT();
  const title = useTitle();
  const now = useNow(30_000);
  const index = useListIndex();
  const visible = (items ?? []).filter((item) => !item.media.isAdult);

  if (!loading && visible.length === 0) return null;

  const upcomingFirst = [...visible].sort((a, b) => {
    const aPast = a.airingAt <= now ? 1 : 0;
    const bPast = b.airingAt <= now ? 1 : 0;
    return aPast - bPast || (aPast ? b.airingAt - a.airingAt : a.airingAt - b.airingAt);
  });

  return (
    <Section title={t.home.airingToday} to="/schedule" bleed>
      {loading ? (
        <div className="scroll-row">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] w-[260px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="scroll-row pb-1">
          {upcomingFirst.map((item) => {
            const aired = item.airingAt <= now;
            const status = index.statusOf(item.media.id);
            return (
              <Link
                key={item.id}
                to={`/media/${item.media.id}`}
                className="flex w-[264px] items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-3 transition-colors hover:bg-surface-2"
              >
                <Image
                  src={item.media.coverImage.medium ?? item.media.coverImage.large}
                  alt=""
                  color={item.media.coverImage.color}
                  className="h-[60px] w-[42px] shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                    {status && <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} aria-hidden />}
                    <span className="truncate">{title(item.media.title)}</span>
                  </p>
                  <p className="tabular mt-0.5 text-[11.5px] font-semibold text-muted">
                    {t.common.ep(item.episode)} · {formatTime(item.airingAt, t.locale)}
                  </p>
                </div>
                <span
                  className={cn(
                    "tabular shrink-0 rounded-md px-2 py-1 text-[11px] font-bold",
                    aired ? "bg-surface-3 text-faint" : "bg-primary/12 text-primary-hover",
                  )}
                >
                  {aired ? t.home.aired : formatCountdown(item.airingAt - now, t)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

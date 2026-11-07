"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useUserActivity } from "@/api/hooks";
import { useAuthGuard } from "@/api/auth";
import { useToggleLike } from "@/api/mutations";
import { useTitle } from "@/api/session";
import type { Activity } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatRelative } from "@/lib/format";
import { plainText } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Poster } from "@/components/media/Poster";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RowsSkeleton } from "@/components/ui/Skeleton";

function LikeButton({ activity }: { activity: Activity }) {
  const t = useT();
  const guard = useAuthGuard();
  const like = useToggleLike();
  return (
    <button
      type="button"
      aria-pressed={Boolean(activity.isLiked)}
      aria-label={t.activity.like}
      onClick={guard(() => like.mutate(activity.id))}
      className={cn("inline-flex h-11 min-w-11 items-center justify-end gap-1.5 text-13 transition-colors", activity.isLiked ? "text-accent-ink" : "text-fg3 hover:text-fg2")}
    >
      <Icon icon={Heart} filled={Boolean(activity.isLiked)} />
      {activity.likeCount > 0 ? <span className="figure">{activity.likeCount}</span> : null}
    </button>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const t = useT();
  const title = useTitle();
  const time = formatRelative(activity.createdAt, t.locale);

  if (activity.type === "TEXT") {
    const text = plainText(activity.text);
    if (!text) return null;
    return (
      <li className="flex flex-col gap-1 border-b border-line py-3">
        <p className="line-clamp-4 text-15 whitespace-pre-line text-fg2">{text}</p>
        <div className="flex items-center justify-between text-12 text-fg3">
          <span>{time}</span>
          <LikeButton activity={activity} />
        </div>
      </li>
    );
  }

  if (!activity.media) return null;
  const status = activity.status ? (t.activity.statuses[activity.status] ?? activity.status) : "";

  return (
    <li className="flex h-[76px] items-center gap-3 border-b border-line">
      <Link href={`/media/${activity.media.id}`} tabIndex={-1} aria-hidden className="shrink-0">
        <Poster src={activity.media.coverImage.medium ?? activity.media.coverImage.large} alt="" sizes="36px" chamfer="sm" className="w-9" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-13 text-fg3">
          {status}
          {activity.progress ? <span className="figure text-fg2"> {activity.progress}</span> : null}
        </p>
        <Link href={`/media/${activity.media.id}`} className="truncate text-15 text-fg">
          {title(activity.media.title)}
        </Link>
        <p className="text-12 text-fg3">{time}</p>
      </div>
      <LikeButton activity={activity} />
    </li>
  );
}

function progressBounds(progress: string | null): [number, number] | null {
  const numbers = (progress ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;
  return [Math.min(...numbers), Math.max(...numbers)];
}

export function groupActivity(items: Activity[]): Activity[] {
  const result: Activity[] = [];
  for (const item of items) {
    const previous = result.at(-1);
    if (
      previous &&
      previous.type !== "TEXT" &&
      item.type !== "TEXT" &&
      previous.media &&
      item.media &&
      previous.media.id === item.media.id &&
      previous.status === item.status
    ) {
      const a = progressBounds(previous.progress);
      const b = progressBounds(item.progress);
      if (a && b) {
        const low = Math.min(a[0], b[0]);
        const high = Math.max(a[1], b[1]);
        result[result.length - 1] = {
          ...previous,
          progress: low === high ? String(low) : `${low} – ${high}`,
          likeCount: previous.likeCount + item.likeCount,
        };
        continue;
      }
      if (!a && !b) continue;
    }
    result.push(item);
  }
  return result;
}

export function ActivityFeed({ userId }: { userId: number }) {
  const t = useT();
  const query = useUserActivity(userId);

  return (
    <Section title={t.profile.activity}>
      {query.isPending ? (
        <div className="-mx-4">
          <RowsSkeleton count={4} height={76} />
        </div>
      ) : query.items.length === 0 ? (
        <p className="text-15 text-fg2">{t.profile.noActivity}</p>
      ) : (
        <ul className="border-t border-line">
          {groupActivity(query.items).map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </ul>
      )}
      {query.hasNextPage ? (
        <Button variant="ghost" block className="mt-2" busy={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t.common.loadMore}
        </Button>
      ) : null}
    </Section>
  );
}

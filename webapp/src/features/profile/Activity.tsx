import { Link } from "react-router";
import { Heart, MessageCircle } from "lucide-react";
import { useUserActivity } from "@/api/hooks";
import { useAuthGuard } from "@/api/auth";
import { useToggleLike } from "@/api/mutations";
import { useTitle } from "@/api/session";
import type { Activity } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatRelative } from "@/lib/format";
import { plainText } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Image } from "@/components/ui/Image";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/Skeleton";

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
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold transition-colors",
        activity.isLiked ? "text-[#FB7185]" : "text-faint hover:text-fg",
      )}
    >
      <Heart className={cn("size-4", activity.isLiked && "fill-current")} />
      {activity.likeCount > 0 && <span className="tabular">{activity.likeCount}</span>}
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
      <li className="rounded-xl border border-line bg-surface p-3.5">
        <p className="line-clamp-5 text-[13px] leading-relaxed whitespace-pre-line text-fg/85">{text}</p>
        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-faint">
          <span>{time}</span>
          <div className="flex items-center">
            {activity.replyCount > 0 && (
              <span className="inline-flex h-9 items-center gap-1.5 px-2">
                <MessageCircle className="size-4" />
                <span className="tabular">{activity.replyCount}</span>
              </span>
            )}
            <LikeButton activity={activity} />
          </div>
        </div>
      </li>
    );
  }

  if (!activity.media) return null;
  const status = activity.status ? (t.activity.statuses[activity.status] ?? activity.status) : "";
  const line = [status, activity.progress].filter(Boolean).join(" ");

  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-1">
      <Link to={`/media/${activity.media.id}`} className="shrink-0">
        <Image
          src={activity.media.coverImage.medium ?? activity.media.coverImage.large}
          alt=""
          color={activity.media.coverImage.color}
          className="h-[64px] w-[44px] rounded-md"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-muted first-letter:uppercase">{line}</p>
        <Link to={`/media/${activity.media.id}`} className="line-clamp-1 text-[13px] font-semibold">
          {title(activity.media.title)}
        </Link>
        <p className="mt-0.5 text-[11px] font-semibold text-faint">{time}</p>
      </div>
      <LikeButton activity={activity} />
    </li>
  );
}

export function ActivityFeed({ userId }: { userId: number }) {
  const t = useT();
  const query = useUserActivity(userId);

  return (
    <Section title={t.profile.activity}>
      {query.isPending ? (
        <div className="-mx-4">
          <ListSkeleton count={4} />
        </div>
      ) : query.items.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-center text-[13px] text-muted">{t.profile.noActivity}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {query.items.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <Button variant="ghost" block className="mt-2" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t.common.loadMore}
        </Button>
      )}
    </Section>
  );
}

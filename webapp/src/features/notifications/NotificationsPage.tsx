import { useEffect } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { useNotifications } from "@/api/hooks";
import { SESSION_KEY, useTitle, useViewer, type SessionState } from "@/api/session";
import type { AppNotification, MediaTitle } from "@/api/types";
import { useT, type Dict } from "@/lib/i18n";
import { formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoginGate } from "@/components/auth/LoginGate";
import { Image } from "@/components/ui/Image";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { InfiniteSentinel } from "@/components/ui/InfiniteSentinel";

interface Described {
  text: string;
  to: string | null;
  image: string | null;
  color: string | null;
}

function describe(item: AppNotification, t: Dict, title: (value: MediaTitle) => string): Described {
  switch (item.type) {
    case "AIRING":
      return {
        text: t.notifications.airing(item.episode, title(item.media.title)),
        to: `/media/${item.media.id}`,
        image: item.media.coverImage.medium,
        color: item.media.coverImage.color,
      };
    case "RELATED_MEDIA_ADDITION":
    case "MEDIA_DATA_CHANGE":
      return {
        text: item.type === "RELATED_MEDIA_ADDITION" ? t.notifications.related(title(item.media.title)) : t.notifications.dataChange(title(item.media.title)),
        to: `/media/${item.media.id}`,
        image: item.media.coverImage.medium,
        color: item.media.coverImage.color,
      };
    default: {
      const name = item.user?.name ?? "";
      const builders: Record<typeof item.type, (n: string) => string> = {
        FOLLOWING: t.notifications.following,
        ACTIVITY_LIKE: t.notifications.like,
        ACTIVITY_REPLY: t.notifications.reply,
        ACTIVITY_MESSAGE: t.notifications.message,
        ACTIVITY_MENTION: t.notifications.mention,
        ACTIVITY_REPLY_LIKE: t.notifications.replyLike,
      };
      return {
        text: (builders[item.type] ?? t.notifications.like)(name),
        to: item.user ? `/user/${encodeURIComponent(item.user.name)}` : null,
        image: item.user?.avatar.medium ?? null,
        color: null,
      };
    }
  }
}

function NotificationRow({ item }: { item: AppNotification }) {
  const t = useT();
  const pick = useTitle();
  const info = describe(item, t, pick);
  const isUser = !("media" in item);
  const body = (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-3">
      <Image
        src={info.image}
        alt=""
        color={info.color}
        className={isUser ? "size-12 shrink-0 rounded-full" : "h-[64px] w-[44px] shrink-0 rounded-md"}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-3 text-[13px] leading-snug font-semibold">{info.text}</p>
        <p className="mt-1 text-[11px] font-semibold text-faint">{formatRelative(item.createdAt, t.locale)}</p>
      </div>
    </div>
  );
  return <li>{info.to ? <Link to={info.to}>{body}</Link> : body}</li>;
}

export function NotificationsPage() {
  const t = useT();
  const viewer = useViewer();
  const client = useQueryClient();
  const query = useNotifications(Boolean(viewer));

  useEffect(() => {
    if (!query.isSuccess) return;
    client.setQueryData<SessionState>(SESSION_KEY, (prev) =>
      prev?.anilist ? { ...prev, anilist: { ...prev.anilist, unread_notifications: 0 } } : prev,
    );
  }, [query.isSuccess, client]);

  return (
    <div>
      <PageHeader title={t.notifications.title} />
      {!viewer ? (
        <LoginGate />
      ) : query.isPending ? (
        <ListSkeleton count={8} />
      ) : query.isError && query.items.length === 0 ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.items.length === 0 ? (
        <EmptyState icon={<BellOff className="size-6" />} title={t.notifications.empty} />
      ) : (
        <ul className="flex flex-col gap-2 px-4">
          {query.items.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
          <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
        </ul>
      )}
    </div>
  );
}

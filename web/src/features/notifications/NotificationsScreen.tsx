"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/api/hooks";
import { SESSION_KEY, useTitle, useViewer, type SessionState } from "@/api/session";
import type { AppNotification, MediaTitle } from "@/api/types";
import { useT, type Dict } from "@/lib/i18n";
import { formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/shell/PageHeader";
import { LoginGate } from "@/components/shell/LoginGate";
import { Avatar, Poster } from "@/components/media/Poster";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { Sentinel } from "@/components/ui/Sentinel";

interface Described {
  text: string;
  href: string | null;
  image: string | null;
  person: boolean;
}

function describe(item: AppNotification, t: Dict, title: (value: MediaTitle) => string): Described {
  switch (item.type) {
    case "AIRING":
      return { text: t.notifications.airing(item.episode, title(item.media.title)), href: `/media/${item.media.id}`, image: item.media.coverImage.medium, person: false };
    case "RELATED_MEDIA_ADDITION":
      return { text: t.notifications.related(title(item.media.title)), href: `/media/${item.media.id}`, image: item.media.coverImage.medium, person: false };
    case "MEDIA_DATA_CHANGE":
      return { text: t.notifications.dataChange(title(item.media.title)), href: `/media/${item.media.id}`, image: item.media.coverImage.medium, person: false };
    default: {
      const name = item.user?.name ?? "";
      const builders: Record<typeof item.type, (value: string) => string> = {
        FOLLOWING: t.notifications.following,
        ACTIVITY_LIKE: t.notifications.like,
        ACTIVITY_REPLY: t.notifications.reply,
        ACTIVITY_MESSAGE: t.notifications.message,
        ACTIVITY_MENTION: t.notifications.mention,
        ACTIVITY_REPLY_LIKE: t.notifications.replyLike,
      };
      return {
        text: (builders[item.type] ?? t.notifications.like)(name),
        href: item.user ? `/user/${encodeURIComponent(item.user.name)}` : null,
        image: item.user?.avatar.medium ?? null,
        person: true,
      };
    }
  }
}

function NotificationRow({ item }: { item: AppNotification }) {
  const t = useT();
  const pick = useTitle();
  const info = describe(item, t, pick);
  const body = (
    <div className="flex min-h-[76px] items-center gap-3 border-b border-line py-3">
      {info.person ? <Avatar src={info.image} alt="" size={36} /> : <Poster src={info.image} alt="" sizes="36px" chamfer="sm" className="w-9 shrink-0" />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="line-clamp-2 text-15 text-fg">{info.text}</p>
        <p className="text-12 text-fg3">{formatRelative(item.createdAt, t.locale)}</p>
      </div>
    </div>
  );
  return <li>{info.href ? <Link href={info.href}>{body}</Link> : body}</li>;
}

export function NotificationsScreen() {
  const t = useT();
  const viewer = useViewer();
  const client = useQueryClient();
  const query = useNotifications(Boolean(viewer));

  useEffect(() => {
    if (!query.isSuccess) return;
    client.setQueryData<SessionState>(SESSION_KEY, (prev) => (prev?.anilist ? { ...prev, anilist: { ...prev.anilist, unread_notifications: 0 } } : prev));
  }, [query.isSuccess, client]);

  return (
    <div>
      <PageHeader title={t.notifications.title} />
      {!viewer ? (
        <LoginGate />
      ) : query.isPending ? (
        <RowsSkeleton count={8} height={76} />
      ) : query.isError && query.items.length === 0 ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.items.length === 0 ? (
        <EmptyState title={t.notifications.empty} />
      ) : (
        <ul className="px-4">
          {query.items.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
          <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
        </ul>
      )}
    </div>
  );
}

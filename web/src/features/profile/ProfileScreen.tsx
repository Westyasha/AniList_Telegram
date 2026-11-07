"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ApiError } from "@/api/client";
import { useUserProfile } from "@/api/hooks";
import { useAuthGuard } from "@/api/auth";
import { useToggleFollow } from "@/api/mutations";
import { useViewer } from "@/api/session";
import type { MediaType, UserProfile } from "@/api/types";
import { useT } from "@/lib/i18n";
import { openExternal } from "@/lib/telegram";
import { Banner } from "@/components/media/Banner";
import { Avatar } from "@/components/media/Poster";
import { PosterRow } from "@/components/media/PosterRow";
import { PersonTile } from "@/components/media/PersonTile";
import { FloatingBack, HeaderActions, PageHeader } from "@/components/shell/PageHeader";
import { LoginGate } from "@/components/shell/LoginGate";
import { Button, IconButton } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Section } from "@/components/ui/Section";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityFeed } from "./Activity";
import { Breakdown, Headline } from "./Stats";
import { FavouriteShelf } from "./Shelf";
import { profileAccent } from "@/lib/profileColor";

function ProfileSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="w-full" style={{ height: "calc(140px + var(--safe-top))" }} />
      <div className="-mt-10 flex flex-col gap-3 px-4">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-5 w-40 rounded-[2px]" />
      </div>
      <div className="mt-8 grid grid-cols-4 gap-3 px-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-12 rounded-[2px]" />
        ))}
      </div>
    </div>
  );
}

function FollowButton({ user }: { user: UserProfile }) {
  const t = useT();
  const guard = useAuthGuard();
  const follow = useToggleFollow();
  const following = Boolean(user.isFollowing);
  return (
    <Button variant={following ? "secondary" : "primary"} onClick={guard(() => follow.mutate(user.id))}>
      {following ? t.profile.following : t.profile.follow}
    </Button>
  );
}

function ProfileView({ lookup, isSelf }: { lookup: { id?: number; name?: string }; isSelf: boolean }) {
  const t = useT();
  const viewer = useViewer();
  const { data, isPending, isError, error, refetch } = useUserProfile(lookup);
  const [type, setType] = useState<MediaType>("ANIME");
  const user = data?.User;

  if (isPending) return <ProfileSkeleton />;
  if (isError || !user) {
    const notFound = !isError || (error instanceof ApiError && error.status === 404);
    return (
      <div className="relative pt-safe">
        <FloatingBack />
        {notFound ? <EmptyState title={t.profile.notFound} className="pt-24" /> : <ErrorState error={error} onRetry={() => void refetch()} className="pt-24" />}
      </div>
    );
  }

  const favourites = user.favourites;
  const showFollow = !isSelf && viewer && viewer.id !== user.id;
  const accent = profileAccent(user.options?.profileColor);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <div className="relative">
          {!isSelf ? <FloatingBack /> : null}
          <Banner src={user.bannerImage} height={196} preload>
            {isSelf ? (
              <div className="absolute right-1 z-10" style={{ top: "calc(var(--safe-top) + 8px)" }}>
                <HeaderActions />
              </div>
            ) : null}
          </Banner>
        </div>
        <div className="relative z-10 -mt-14 flex flex-col gap-4 px-4">
          <div className="w-fit rounded-full p-[3px]" style={{ background: accent }}>
            <Avatar src={user.avatar.large ?? user.avatar.medium} alt={user.name} size={96} preload className="border-[3px] border-bg" />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="truncate text-32 leading-tight font-semibold text-fg">{user.name}</h1>
              <p className="flex flex-wrap gap-x-3 text-13 text-fg3">
                {user.createdAt ? <span>{t.profile.joined(user.createdAt)}</span> : null}
                {user.isFollower ? <span className="text-fg2">{t.profile.followsYou}</span> : null}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showFollow ? <FollowButton user={user} /> : null}
              <IconButton icon={ExternalLink} label={t.profile.openOnAniList} outline onClick={() => openExternal(user.siteUrl)} />
            </div>
          </div>
        </div>
      </div>

      <FavouriteShelf title={t.profile.favourites.anime} items={favourites.anime.nodes} accent={accent} />

      <div className="flex flex-col gap-6">
        <Tabs<MediaType>
          label={t.profile.anime}
          value={type}
          onChange={setType}
          items={[
            { value: "ANIME", label: t.profile.anime },
            { value: "MANGA", label: t.profile.manga },
          ]}
        />
        <Headline type={type} anime={user.statistics.anime} manga={user.statistics.manga} />
      </div>

      <Breakdown
        type={type}
        anime={user.statistics.anime}
        manga={user.statistics.manga}
        format={user.mediaListOptions?.scoreFormat ?? null}
        accent={accent}
      />

      {favourites.characters.nodes.length > 0 ? (
        <Section title={t.profile.favourites.characters} bleed>
          <div className="scroll-row">
            {favourites.characters.nodes.map((character) => (
              <PersonTile key={character.id} href={`/character/${character.id}`} name={character.name} image={character.image} sizes="112px" className="w-[112px]" />
            ))}
          </div>
        </Section>
      ) : null}
      <PosterRow title={t.profile.favourites.manga} items={favourites.manga.nodes} />
      {favourites.staff.nodes.length > 0 ? (
        <Section title={t.profile.favourites.staff} bleed>
          <div className="scroll-row">
            {favourites.staff.nodes.map((staff) => (
              <PersonTile key={staff.id} href={`/staff/${staff.id}`} name={staff.name} image={staff.image} sizes="104px" className="w-[104px]" />
            ))}
          </div>
        </Section>
      ) : null}

      <ActivityFeed userId={user.id} />
    </div>
  );
}

export function UserProfileScreen() {
  const viewer = useViewer();
  const raw = useParams<{ name: string }>().name ?? "";
  const name = decodeURIComponent(raw);
  const lookup = useMemo(() => (/^\d+$/.test(name) ? { id: Number(name) } : { name }), [name]);
  const isSelf = Boolean(viewer && (viewer.name.toLowerCase() === name.toLowerCase() || viewer.id === lookup.id));
  return <ProfileView lookup={lookup} isSelf={isSelf} />;
}

export function MyProfileScreen() {
  const t = useT();
  const viewer = useViewer();
  const lookup = useMemo(() => ({ id: viewer?.id }), [viewer?.id]);

  if (!viewer) {
    return (
      <div>
        <PageHeader title={t.tabs.profile} actions={<HeaderActions />} />
        <LoginGate />
        <div className="px-4">
          <Link href="/settings" className="inline-flex h-11 items-center text-15 text-fg2 transition-colors hover:text-fg">
            {t.common.settings}
          </Link>
        </div>
      </div>
    );
  }
  return <ProfileView lookup={lookup} isSelf />;
}

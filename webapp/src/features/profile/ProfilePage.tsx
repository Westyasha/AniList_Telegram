import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ExternalLink, UserCheck, UserPlus } from "lucide-react";
import { ApiError } from "@/api/client";
import { useUserProfile } from "@/api/hooks";
import { useAuthGuard } from "@/api/auth";
import { useToggleFollow } from "@/api/mutations";
import { useViewer } from "@/api/session";
import type { MediaType, UserProfile } from "@/api/types";
import { useT } from "@/lib/i18n";
import { accentStyle } from "@/lib/color";
import { formatMonthYear } from "@/lib/format";
import { openExternal } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Banner } from "@/components/media/Banner";
import { MediaRow } from "@/components/media/MediaRow";
import { PersonCard } from "@/components/media/PersonCard";
import { HeaderActions, PageHeader } from "@/components/layout/PageHeader";
import { LoginGate } from "@/components/auth/LoginGate";
import { Image } from "@/components/ui/Image";
import { Button, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Section } from "@/components/ui/Section";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityFeed } from "./Activity";
import { Breakdown, Overview } from "./Stats";

const PROFILE_COLORS: Record<string, string> = {
  blue: "#3DB4F2",
  purple: "#A78BFA",
  pink: "#F472B6",
  orange: "#F59E0B",
  red: "#E0233D",
  green: "#4ADE80",
  gray: "#9A9AA8",
};

function profileAccent(color: string | null | undefined): string | null {
  if (!color) return null;
  return PROFILE_COLORS[color] ?? (color.startsWith("#") ? color : null);
}

function ProfileSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="h-[calc(160px+var(--safe-top))] w-full rounded-none" />
      <div className="-mt-12 flex flex-col items-center gap-3 px-4">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 px-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[64px] rounded-xl" />
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
    <Button
      variant={following ? "secondary" : "primary"}
      size="md"
      icon={following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      onClick={guard(() => follow.mutate(user.id))}
    >
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
  const accent = useMemo(() => accentStyle(profileAccent(user?.options?.profileColor) ?? "#E0233D"), [user?.options?.profileColor]);

  if (isPending) return <ProfileSkeleton />;
  if (isError || !user) {
    const notFound = !isError || (error instanceof ApiError && error.status === 404);
    return (
      <div style={{ paddingTop: "calc(var(--safe-top) + 64px)" }}>
        {notFound ? <EmptyState title={t.profile.notFound} /> : <ErrorState error={error} onRetry={() => void refetch()} />}
      </div>
    );
  }

  const favourites = user.favourites;
  const showFollow = !isSelf && viewer && viewer.id !== user.id;

  return (
    <div style={accent} className="flex flex-col gap-6">
      <div>
        <Banner src={user.bannerImage} height={150}>
          {isSelf && (
            <div className="absolute right-2 flex" style={{ top: "calc(var(--safe-top) + 6px)" }}>
              <div className="flex rounded-full bg-black/40 backdrop-blur-md">
                <HeaderActions />
              </div>
            </div>
          )}
        </Banner>
        <div className="relative z-10 -mt-14 flex flex-col items-center px-4 text-center">
          <Image
            src={user.avatar.large ?? user.avatar.medium}
            alt={user.name}
            eager
            className="size-[104px] rounded-full shadow-[0_12px_32px_-10px_rgba(0,0,0,0.9)] ring-4 ring-bg"
          />
          <h1 className="mt-3 text-[22px] font-extrabold tracking-[-0.02em]">{user.name}</h1>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-faint">
            {user.createdAt && <span>{t.profile.joined(formatMonthYear(user.createdAt, t.locale))}</span>}
            {user.isFollower && <span className="rounded bg-surface-3 px-1.5 py-0.5 text-muted">{t.profile.followsYou}</span>}
          </div>
          <div className="mt-4 flex items-center gap-2">
            {showFollow && <FollowButton user={user} />}
            <IconButton
              label={t.profile.openOnAniList}
              onClick={() => openExternal(user.siteUrl)}
              className="size-11 rounded-xl border border-line bg-surface-2"
            >
              <ExternalLink className="size-[18px]" />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="px-4">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "ANIME", label: t.profile.anime },
            { value: "MANGA", label: t.profile.manga },
          ]}
        />
      </div>

      <Overview type={type} anime={user.statistics.anime} manga={user.statistics.manga} />
      <Breakdown type={type} anime={user.statistics.anime} manga={user.statistics.manga} />

      <MediaRow title={t.profile.favourites.anime} items={favourites.anime.nodes.filter((m) => !m.isAdult)} />
      <MediaRow title={t.profile.favourites.manga} items={favourites.manga.nodes.filter((m) => !m.isAdult)} />
      {favourites.characters.nodes.length > 0 && (
        <Section title={t.profile.favourites.characters} bleed>
          <div className="scroll-row">
            {favourites.characters.nodes.map((character) => (
              <PersonCard key={character.id} to={`/character/${character.id}`} name={character.name} image={character.image} className="w-[104px]" />
            ))}
          </div>
        </Section>
      )}
      {favourites.staff.nodes.length > 0 && (
        <Section title={t.profile.favourites.staff} bleed>
          <div className="scroll-row">
            {favourites.staff.nodes.map((staff) => (
              <PersonCard key={staff.id} to={`/staff/${staff.id}`} name={staff.name} image={staff.image} className="w-[104px]" />
            ))}
          </div>
        </Section>
      )}

      <ActivityFeed userId={user.id} />
    </div>
  );
}

export function UserProfilePage() {
  const viewer = useViewer();
  const name = decodeURIComponent(useParams().name ?? "");
  const lookup = useMemo(() => (/^\d+$/.test(name) ? { id: Number(name) } : { name }), [name]);
  const isSelf = Boolean(viewer && (viewer.name.toLowerCase() === name.toLowerCase() || viewer.id === lookup.id));
  return <ProfileView lookup={lookup} isSelf={isSelf} />;
}

export function MyProfilePage() {
  const t = useT();
  const viewer = useViewer();
  const lookup = useMemo(() => ({ id: viewer?.id }), [viewer?.id]);

  if (!viewer) {
    return (
      <div>
        <PageHeader title={t.tabs.profile} actions={<HeaderActions />} />
        <LoginGate />
        <div className="px-5">
          <Link
            to="/settings"
            className={cn("flex h-12 items-center justify-center rounded-xl border border-line bg-surface text-sm font-semibold text-muted")}
          >
            {t.common.settings}
          </Link>
        </div>
      </div>
    );
  }
  return <ProfileView lookup={lookup} isSelf />;
}

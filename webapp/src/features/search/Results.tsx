import { Link } from "react-router";
import { UserRound } from "lucide-react";
import { useSearchCharacters, useSearchMedia, useSearchStaff, useSearchUsers } from "@/api/hooks";
import type { SearchMediaVariables } from "@/api/types";
import { useT } from "@/lib/i18n";
import { pickTitle } from "@/api/session";
import { CoverGrid } from "@/components/media/MediaRow";
import { PersonCard } from "@/components/media/PersonCard";
import { Image } from "@/components/ui/Image";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { GridSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { InfiniteSentinel } from "@/components/ui/InfiniteSentinel";

function NoResults({ onClear }: { onClear?: () => void }) {
  const t = useT();
  return (
    <EmptyState
      title={t.search.noResults}
      body={t.search.noResultsBody}
      action={
        onClear && (
          <button type="button" onClick={onClear} className="h-11 rounded-xl px-4 text-sm font-semibold text-primary-hover">
            {t.search.clearFilters}
          </button>
        )
      }
    />
  );
}

export function MediaResults({ variables, onClearFilters }: { variables: SearchMediaVariables; onClearFilters?: () => void }) {
  const t = useT();
  const query = useSearchMedia(variables);
  const items = (query.data?.pages ?? []).flatMap((page) => page.Page.media).filter((media) => !media.isAdult);
  const total = query.data?.pages[0]?.Page.pageInfo.total;

  if (query.isPending) return <GridSkeleton count={12} />;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (items.length === 0) return <NoResults onClear={onClearFilters} />;

  return (
    <div className="px-4" style={{ opacity: query.isPlaceholderData ? 0.55 : 1, transition: "opacity 0.2s" }}>
      {total != null && total > 0 && <p className="tabular mb-3 text-xs font-semibold text-faint">{t.search.total(total)}</p>}
      <CoverGrid items={items} />
      <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

export function CharacterResults({ search }: { search: string }) {
  const query = useSearchCharacters({ search: search || undefined });
  const items = (query.data?.pages ?? []).flatMap((page) => page.Page.characters);

  if (query.isPending) return <GridSkeleton count={12} />;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (items.length === 0) return <NoResults />;

  return (
    <div className="px-4" style={{ opacity: query.isPlaceholderData ? 0.55 : 1 }}>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
        {items.map((character) => {
          const media = character.media.nodes[0];
          return (
            <PersonCard
              key={character.id}
              to={`/character/${character.id}`}
              name={character.name}
              image={character.image}
              favourites={character.favourites}
              subtitle={media ? pickTitle({ ...media.title, native: null }, true) : null}
            />
          );
        })}
      </div>
      <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

export function StaffResults({ search }: { search: string }) {
  const query = useSearchStaff({ search: search || undefined });
  const items = (query.data?.pages ?? []).flatMap((page) => page.Page.staff);

  if (query.isPending) return <GridSkeleton count={12} />;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (items.length === 0) return <NoResults />;

  return (
    <div className="px-4" style={{ opacity: query.isPlaceholderData ? 0.55 : 1 }}>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
        {items.map((staff) => (
          <PersonCard
            key={staff.id}
            to={`/staff/${staff.id}`}
            name={staff.name}
            image={staff.image}
            favourites={staff.favourites}
            subtitle={staff.primaryOccupations.slice(0, 2).join(", ") || null}
          />
        ))}
      </div>
      <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

export function UserResults({ search }: { search: string }) {
  const t = useT();
  const enabled = search.trim().length > 0;
  const query = useSearchUsers({ search }, enabled);
  const items = (query.data?.pages ?? []).flatMap((page) => page.Page.users);

  if (!enabled) return <EmptyState icon={<UserRound className="size-6" />} title={t.search.typeToSearch} />;
  if (query.isPending) return <ListSkeleton />;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (items.length === 0) return <NoResults />;

  return (
    <div className="flex flex-col gap-2 px-4">
      {items.map((user) => (
        <Link
          key={user.id}
          to={`/user/${encodeURIComponent(user.name)}`}
          className="relative flex h-[72px] items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface px-3"
        >
          {user.bannerImage && (
            <Image src={user.bannerImage} alt="" className="absolute inset-0 opacity-25 [mask-image:linear-gradient(to_left,black,transparent_80%)]" />
          )}
          <Image src={user.avatar.medium ?? user.avatar.large} alt="" className="relative size-12 shrink-0 rounded-full ring-2 ring-surface" />
          <span className="relative truncate text-sm font-bold">{user.name}</span>
        </Link>
      ))}
      <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchCharacters, useSearchMedia, useSearchStaff, useSearchUsers } from "@/api/hooks";
import { pickTitle } from "@/api/session";
import type { SearchMediaVariables } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { PosterGrid } from "@/components/media/PosterRow";
import { PersonTile } from "@/components/media/PersonTile";
import { Avatar } from "@/components/media/Poster";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { GridSkeleton, RowsSkeleton } from "@/components/ui/Skeleton";
import { Sentinel } from "@/components/ui/Sentinel";
import { Figures } from "@/components/ui/Figures";

function NoResults({ onClear }: { onClear?: () => void }) {
  const t = useT();
  return (
    <EmptyState
      title={t.search.noResults}
      action={
        onClear ? (
          <Button variant="secondary" onClick={onClear}>
            {t.search.clearFilters}
          </Button>
        ) : undefined
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
    <div className="px-4 transition-opacity duration-120" style={{ opacity: query.isPlaceholderData ? 0.5 : 1 }}>
      {total != null && total > 0 ? <Figures text={t.search.total(total)} className="mb-4 block text-13 text-fg3" /> : null}
      <PosterGrid items={items} />
      <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

export function CharacterResults({ search }: { search: string }) {
  const t = useT();
  const query = useSearchCharacters({ search: search || undefined });
  const items = (query.data?.pages ?? []).flatMap((page) => page.Page.characters);

  if (query.isPending) return <GridSkeleton count={12} />;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (items.length === 0) return <NoResults />;

  return (
    <div className="px-4" style={{ opacity: query.isPlaceholderData ? 0.5 : 1 }}>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
        {items.map((character) => {
          const media = character.media.nodes[0];
          return (
            <PersonTile
              key={character.id}
              href={`/character/${character.id}`}
              name={character.name}
              image={character.image}
              subtitle={media ? pickTitle({ ...media.title, native: null }, true) : formatNumber(character.favourites, t.locale)}
            />
          );
        })}
      </div>
      <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
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
    <div className="px-4" style={{ opacity: query.isPlaceholderData ? 0.5 : 1 }}>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
        {items.map((staff) => (
          <PersonTile
            key={staff.id}
            href={`/staff/${staff.id}`}
            name={staff.name}
            image={staff.image}
            subtitle={staff.primaryOccupations.slice(0, 2).join(", ") || null}
          />
        ))}
      </div>
      <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

export function UserResults({ search }: { search: string }) {
  const t = useT();
  const enabled = search.trim().length > 0;
  const query = useSearchUsers({ search }, enabled);
  const items = (query.data?.pages ?? []).flatMap((page) => page.Page.users);

  if (!enabled) return <EmptyState title={t.search.typeToSearch} />;
  if (query.isPending) return <RowsSkeleton count={6} height={64} />;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (items.length === 0) return <NoResults />;

  return (
    <ul className="px-4">
      {items.map((user) => (
        <li key={user.id}>
          <Link href={`/user/${encodeURIComponent(user.name)}`} className="flex h-16 items-center gap-3 border-b border-line">
            <Avatar src={user.avatar.medium ?? user.avatar.large} alt="" size={40} />
            <span className="truncate text-15 text-fg">{user.name}</span>
          </Link>
        </li>
      ))}
      <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </ul>
  );
}

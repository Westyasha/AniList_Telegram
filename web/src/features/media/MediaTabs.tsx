"use client";

import Link from "next/link";
import { useMediaCharacters, useMediaStaff } from "@/api/hooks";
import type { CharacterEdge, MediaDetails } from "@/api/types";
import { useT } from "@/lib/i18n";
import { PosterGrid } from "@/components/media/PosterRow";
import { Poster } from "@/components/media/Poster";
import { personName } from "@/components/media/PersonTile";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { Sentinel } from "@/components/ui/Sentinel";

function CastRow({ edge }: { edge: CharacterEdge }) {
  const t = useT();
  const actor = edge.voiceActors[0];
  return (
    <li className="grid h-[88px] grid-cols-2 gap-3 border-b border-line">
      <Link href={`/character/${edge.node.id}`} className="flex min-w-0 items-center gap-3">
        <Poster src={edge.node.image.medium ?? edge.node.image.large} alt="" sizes="48px" chamfer="sm" className="w-12 shrink-0" />
        <span className="flex min-w-0 flex-col">
          <span className="line-clamp-2 text-13 font-medium text-fg">{personName(edge.node.name)}</span>
          <span className="truncate text-12 text-fg3">{edge.role ? t.enums.role[edge.role] : ""}</span>
        </span>
      </Link>
      {actor ? (
        <Link href={`/staff/${actor.id}`} className="flex min-w-0 items-center justify-end gap-3 text-right">
          <span className="flex min-w-0 flex-col">
            <span className="line-clamp-2 text-13 text-fg2">{personName(actor.name)}</span>
          </span>
          <Poster src={actor.image.medium ?? actor.image.large} alt="" sizes="48px" chamfer="sm" className="w-12 shrink-0" />
        </Link>
      ) : (
        <span />
      )}
    </li>
  );
}

export function CharactersTab({ mediaId }: { mediaId: number }) {
  const t = useT();
  const query = useMediaCharacters(mediaId, true);
  const edges = (query.data?.pages ?? []).flatMap((page) => page.Media.characters.edges);

  if (query.isPending) return <div className="pt-4"><RowsSkeleton count={6} /></div>;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (edges.length === 0) return <EmptyState title={t.media.noCharacters} />;

  return (
    <div className="px-4 pt-2">
      <ul>
        {edges.map((edge, index) => (
          <CastRow key={`${edge.node.id}-${index}`} edge={edge} />
        ))}
      </ul>
      <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

export function StaffTab({ mediaId }: { mediaId: number }) {
  const t = useT();
  const query = useMediaStaff(mediaId, true);
  const edges = (query.data?.pages ?? []).flatMap((page) => page.Media.staff.edges);

  if (query.isPending) return <div className="pt-4"><RowsSkeleton count={6} /></div>;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (edges.length === 0) return <EmptyState title={t.media.noStaff} />;

  return (
    <div className="px-4 pt-2">
      <ul>
        {edges.map((edge, index) => (
          <li key={`${edge.node.id}-${index}`}>
            <Link href={`/staff/${edge.node.id}`} className="flex h-[88px] items-center gap-3 border-b border-line">
              <Poster src={edge.node.image.medium ?? edge.node.image.large} alt="" sizes="48px" chamfer="sm" className="w-12 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-15 text-fg">{personName(edge.node.name)}</span>
                <span className="line-clamp-2 text-13 text-fg3">{edge.role}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

export function RecommendationsTab({ media }: { media: MediaDetails }) {
  const t = useT();
  const items = media.recommendations.nodes
    .map((node) => node.mediaRecommendation)
    .filter((item): item is NonNullable<typeof item> => Boolean(item && !item.isAdult));

  if (items.length === 0) return <EmptyState title={t.media.noRecommendations} />;

  return (
    <div className="px-4 pt-4">
      <PosterGrid items={items} />
    </div>
  );
}

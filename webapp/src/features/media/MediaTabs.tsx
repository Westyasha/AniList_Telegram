import { Link } from "react-router";
import { useMediaCharacters, useMediaStaff } from "@/api/hooks";
import type { MediaDetails } from "@/api/types";
import { useT } from "@/lib/i18n";
import { CoverGrid } from "@/components/media/MediaRow";
import { CharacterVoiceCard, personName } from "@/components/media/PersonCard";
import { Image } from "@/components/ui/Image";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { InfiniteSentinel } from "@/components/ui/InfiniteSentinel";

export function CharactersTab({ mediaId }: { mediaId: number }) {
  const t = useT();
  const query = useMediaCharacters(mediaId, true);
  const edges = (query.data?.pages ?? []).flatMap((page) => page.Media.characters.edges);

  if (query.isPending) return <div className="pt-4"><ListSkeleton count={6} /></div>;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (edges.length === 0) return <EmptyState title={t.media.noCharacters} />;

  return (
    <div className="flex flex-col gap-2 px-4 pt-4">
      {edges.map((edge, index) => (
        <CharacterVoiceCard key={`${edge.node.id}-${index}`} edge={edge} />
      ))}
      <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
    </div>
  );
}

export function StaffTab({ mediaId }: { mediaId: number }) {
  const t = useT();
  const query = useMediaStaff(mediaId, true);
  const edges = (query.data?.pages ?? []).flatMap((page) => page.Media.staff.edges);

  if (query.isPending) return <div className="pt-4"><ListSkeleton count={6} /></div>;
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (edges.length === 0) return <EmptyState title={t.media.noStaff} />;

  return (
    <div className="grid grid-cols-1 gap-2 px-4 pt-4">
      {edges.map((edge, index) => (
        <Link
          key={`${edge.node.id}-${index}`}
          to={`/staff/${edge.node.id}`}
          className="flex h-[76px] items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface pr-3"
        >
          <Image src={edge.node.image.medium ?? edge.node.image.large} alt="" className="h-full w-[54px] shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{personName(edge.node.name)}</p>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] font-semibold text-faint">{edge.role}</p>
          </div>
        </Link>
      ))}
      <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
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
      <CoverGrid items={items} />
    </div>
  );
}

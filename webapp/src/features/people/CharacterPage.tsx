import { useMemo } from "react";
import { useParams } from "react-router";
import { useCharacter } from "@/api/hooks";
import { useAuthGuard } from "@/api/auth";
import { useToggleFavourite } from "@/api/mutations";
import { useT } from "@/lib/i18n";
import { formatBirthday } from "@/lib/format";
import { CoverGrid } from "@/components/media/MediaRow";
import { personName } from "@/components/media/PersonCard";
import { RichText } from "@/components/media/RichText";
import { Section } from "@/components/ui/Section";
import { ErrorState } from "@/components/ui/States";
import { InfiniteSentinel } from "@/components/ui/InfiniteSentinel";
import { PersonHeader, PersonInfo, PersonSkeleton } from "./PersonLayout";

export function CharacterPage() {
  const t = useT();
  const id = Number(useParams().id);
  const query = useCharacter(id);
  const guard = useAuthGuard();
  const favourite = useToggleFavourite();
  const character = query.data?.pages[0]?.Character;

  const appearances = useMemo(() => {
    const edges = (query.data?.pages ?? []).flatMap((page) => page.Character.media.edges);
    const seen = new Set<number>();
    return edges.filter((edge) => {
      if (edge.node.isAdult || seen.has(edge.node.id)) return false;
      seen.add(edge.node.id);
      return true;
    });
  }, [query.data]);

  if (query.isPending) return <PersonSkeleton />;
  if (query.isError || !character) {
    return (
      <div style={{ paddingTop: "calc(var(--safe-top) + 64px)" }}>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const roles = new Map(appearances.map((edge) => [edge.node.id, edge.characterRole ? t.enums.role[edge.characterRole] : undefined]));

  return (
    <div className="flex flex-col gap-6">
      <PersonHeader
        name={personName(character.name)}
        native={character.name.native}
        alternative={(character.name.alternative ?? []).filter(Boolean).slice(0, 4)}
        image={character.image}
        favourites={character.favourites}
        isFavourite={character.isFavourite}
        onFavourite={guard(() => favourite.mutate({ kind: "character", id: character.id }))}
      />
      <PersonInfo
        rows={[
          [t.person.birthday, formatBirthday(character.dateOfBirth, t.locale)],
          [t.person.age, character.age],
          [t.person.gender, character.gender],
          [t.person.bloodType, character.bloodType],
        ]}
      />
      {character.description && (
        <div className="px-4">
          <RichText source={character.description} collapsedLines={6} />
        </div>
      )}
      {appearances.length > 0 && (
        <Section title={t.person.appearances}>
          <CoverGrid items={appearances.map((edge) => edge.node)} captions={(media) => roles.get(media.id)} />
          <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
        </Section>
      )}
    </div>
  );
}

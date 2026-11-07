"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useCharacter } from "@/api/hooks";
import { useAuthGuard } from "@/api/auth";
import { useToggleFavourite } from "@/api/mutations";
import { useT } from "@/lib/i18n";
import { formatBirthday } from "@/lib/format";
import { PosterGrid } from "@/components/media/PosterRow";
import { personName } from "@/components/media/PersonTile";
import { Section } from "@/components/ui/Section";
import { ErrorState } from "@/components/ui/States";
import { Sentinel } from "@/components/ui/Sentinel";
import { PersonSkeleton, PersonView } from "./PersonLayout";

export function CharacterScreen() {
  const t = useT();
  const id = Number(useParams<{ id: string }>().id);
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
  if (query.isError || !character) return <ErrorState error={query.error} onRetry={() => void query.refetch()} className="pt-24" />;

  const roles = new Map(appearances.map((edge) => [edge.node.id, edge.characterRole ? t.enums.role[edge.characterRole] : undefined]));

  return (
    <PersonView
      name={personName(character.name)}
      native={character.name.native}
      alternative={(character.name.alternative ?? []).filter(Boolean).slice(0, 3)}
      image={character.image}
      favourites={character.favourites}
      isFavourite={character.isFavourite}
      onFavourite={guard(() => favourite.mutate({ kind: "character", id: character.id }))}
      description={character.description}
      rows={[
        [t.person.birthday, formatBirthday(character.dateOfBirth, t.locale)],
        [t.person.age, character.age],
        [t.person.gender, character.gender],
        [t.person.bloodType, character.bloodType],
      ]}
    >
      {appearances.length > 0 ? (
        <Section title={t.person.appearances}>
          <PosterGrid items={appearances.map((edge) => edge.node)} captions={(media) => roles.get(media.id)} />
          <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
        </Section>
      ) : null}
    </PersonView>
  );
}

"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useStaff } from "@/api/hooks";
import { useAuthGuard } from "@/api/auth";
import { useToggleFavourite } from "@/api/mutations";
import type { MediaCard } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatBirthday } from "@/lib/format";
import { PosterGrid } from "@/components/media/PosterRow";
import { PersonTile, personName } from "@/components/media/PersonTile";
import { Section } from "@/components/ui/Section";
import { ErrorState } from "@/components/ui/States";
import { Sentinel } from "@/components/ui/Sentinel";
import { PersonSkeleton, PersonView } from "./PersonLayout";

export function StaffScreen() {
  const t = useT();
  const id = Number(useParams<{ id: string }>().id);
  const query = useStaff(id);
  const guard = useAuthGuard();
  const favourite = useToggleFavourite();
  const staff = query.data?.pages[0]?.Staff;

  const works = useMemo(() => {
    const edges = (query.data?.pages ?? []).flatMap((page) => page.Staff.staffMedia.edges);
    const roles = new Map<number, string[]>();
    const nodes = new Map<number, MediaCard>();
    for (const edge of edges) {
      if (edge.node.isAdult) continue;
      if (!nodes.has(edge.node.id)) nodes.set(edge.node.id, edge.node);
      if (edge.staffRole) roles.set(edge.node.id, [...(roles.get(edge.node.id) ?? []), edge.staffRole]);
    }
    return { items: [...nodes.values()], roles };
  }, [query.data]);

  if (query.isPending) return <PersonSkeleton />;
  if (query.isError || !staff) return <ErrorState error={query.error} onRetry={() => void query.refetch()} className="pt-24" />;

  const years = staff.yearsActive.length ? `${staff.yearsActive[0]}–${staff.yearsActive[1] ?? ""}` : null;

  return (
    <PersonView
      name={personName(staff.name)}
      native={staff.name.native}
      alternative={(staff.name.alternative ?? []).filter(Boolean).slice(0, 3)}
      image={staff.image}
      favourites={staff.favourites}
      isFavourite={staff.isFavourite}
      onFavourite={guard(() => favourite.mutate({ kind: "staff", id: staff.id }))}
      description={staff.description}
      rows={[
        [t.person.occupations, staff.primaryOccupations.join(", ")],
        [t.person.language, staff.languageV2],
        [t.person.birthday, formatBirthday(staff.dateOfBirth, t.locale)],
        [t.person.died, formatBirthday(staff.dateOfDeath, t.locale)],
        [t.person.age, staff.age],
        [t.person.gender, staff.gender],
        [t.person.yearsActive, years ? <span className="figure">{years}</span> : null],
        [t.person.hometown, staff.homeTown],
        [t.person.bloodType, staff.bloodType],
      ]}
    >
      {staff.characters.nodes.length > 0 ? (
        <Section title={t.person.characters} bleed>
          <div className="scroll-row">
            {staff.characters.nodes.map((character) => (
              <PersonTile key={character.id} href={`/character/${character.id}`} name={character.name} image={character.image} sizes="104px" className="w-[104px]" />
            ))}
          </div>
        </Section>
      ) : null}
      {works.items.length > 0 ? (
        <Section title={t.person.roles}>
          <PosterGrid items={works.items} captions={(media) => works.roles.get(media.id)?.join(", ")} />
          <Sentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
        </Section>
      ) : null}
    </PersonView>
  );
}

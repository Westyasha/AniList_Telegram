import { useMemo } from "react";
import { useParams } from "react-router";
import { useStaff } from "@/api/hooks";
import { useAuthGuard } from "@/api/auth";
import { useToggleFavourite } from "@/api/mutations";
import { useT } from "@/lib/i18n";
import { formatBirthday } from "@/lib/format";
import { CoverGrid } from "@/components/media/MediaRow";
import { PersonCard, personName } from "@/components/media/PersonCard";
import { RichText } from "@/components/media/RichText";
import { Section } from "@/components/ui/Section";
import { ErrorState } from "@/components/ui/States";
import { InfiniteSentinel } from "@/components/ui/InfiniteSentinel";
import { PersonHeader, PersonInfo, PersonSkeleton } from "./PersonLayout";

export function StaffPage() {
  const t = useT();
  const id = Number(useParams().id);
  const query = useStaff(id);
  const guard = useAuthGuard();
  const favourite = useToggleFavourite();
  const staff = query.data?.pages[0]?.Staff;

  const works = useMemo(() => {
    const edges = (query.data?.pages ?? []).flatMap((page) => page.Staff.staffMedia.edges);
    const roles = new Map<number, string[]>();
    const order: number[] = [];
    const nodes = new Map<number, (typeof edges)[number]["node"]>();
    for (const edge of edges) {
      if (edge.node.isAdult) continue;
      if (!nodes.has(edge.node.id)) {
        nodes.set(edge.node.id, edge.node);
        order.push(edge.node.id);
      }
      if (edge.staffRole) roles.set(edge.node.id, [...(roles.get(edge.node.id) ?? []), edge.staffRole]);
    }
    return { items: order.map((mediaId) => nodes.get(mediaId)).filter((node): node is NonNullable<typeof node> => Boolean(node)), roles };
  }, [query.data]);

  if (query.isPending) return <PersonSkeleton />;
  if (query.isError || !staff) {
    return (
      <div style={{ paddingTop: "calc(var(--safe-top) + 64px)" }}>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const years = staff.yearsActive.length ? `${staff.yearsActive[0]}${staff.yearsActive[1] ? `–${staff.yearsActive[1]}` : "–"}` : null;

  return (
    <div className="flex flex-col gap-6">
      <PersonHeader
        name={personName(staff.name)}
        native={staff.name.native}
        alternative={(staff.name.alternative ?? []).filter(Boolean).slice(0, 4)}
        image={staff.image}
        favourites={staff.favourites}
        isFavourite={staff.isFavourite}
        onFavourite={guard(() => favourite.mutate({ kind: "staff", id: staff.id }))}
      />
      <PersonInfo
        rows={[
          [t.person.occupations, staff.primaryOccupations.join(", ")],
          [t.person.language, staff.languageV2],
          [t.person.birthday, formatBirthday(staff.dateOfBirth, t.locale)],
          [t.person.died, formatBirthday(staff.dateOfDeath, t.locale)],
          [t.person.age, staff.age],
          [t.person.gender, staff.gender],
          [t.person.yearsActive, years],
          [t.person.hometown, staff.homeTown],
          [t.person.bloodType, staff.bloodType],
        ]}
      />
      {staff.description && (
        <div className="px-4">
          <RichText source={staff.description} collapsedLines={6} />
        </div>
      )}
      {staff.characters.nodes.length > 0 && (
        <Section title={t.person.characters} bleed>
          <div className="scroll-row">
            {staff.characters.nodes.map((character) => (
              <PersonCard
                key={character.id}
                to={`/character/${character.id}`}
                name={character.name}
                image={character.image}
                className="w-[104px]"
              />
            ))}
          </div>
        </Section>
      )}
      {works.items.length > 0 && (
        <Section title={t.person.roles}>
          <CoverGrid items={works.items} captions={(media) => works.roles.get(media.id)?.join(", ")} />
          <InfiniteSentinel hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onMore={() => void query.fetchNextPage()} />
        </Section>
      )}
    </div>
  );
}

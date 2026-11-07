import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import { useMedia } from "@/api/hooks";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { accentStyle } from "@/lib/color";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";
import { MediaHeader } from "./MediaHeader";
import { Overview } from "./Overview";
import { CharactersTab, RecommendationsTab, StaffTab } from "./MediaTabs";

type TabKey = "overview" | "characters" | "staff" | "recommendations";

const TAB_KEYS: TabKey[] = ["overview", "characters", "staff", "recommendations"];

function MediaSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="h-[calc(190px+var(--safe-top))] w-full rounded-none" />
      <div className="-mt-[92px] flex gap-4 px-4">
        <Skeleton className="aspect-[2/3] w-[116px] shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col justify-end gap-2 pb-1">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </div>
      <div className="mt-4 flex gap-2 px-4">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="size-12 rounded-xl" />
        <Skeleton className="size-12 rounded-xl" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 px-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[58px] rounded-xl" />
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-2 px-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-3.5" style={{ width: `${92 - i * 9}%` }} />
        ))}
      </div>
    </div>
  );
}

export function MediaPage() {
  const t = useT();
  const pickTitle = useTitle();
  const params = useParams();
  const id = Number(params.id);
  const [search, setSearch] = useSearchParams();
  const tab = (TAB_KEYS.includes(search.get("tab") as TabKey) ? search.get("tab") : "overview") as TabKey;
  const { data, isPending, isError, error, refetch } = useMedia(id);
  const media = data?.Media;

  useEffect(() => {
    if (media) document.title = pickTitle(media.title);
    return () => {
      document.title = "AniList";
    };
  }, [media, pickTitle]);

  const setTab = (value: TabKey) => {
    setSearch(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "overview") next.delete("tab");
        else next.set("tab", value);
        return next;
      },
      { replace: true },
    );
  };

  if (isPending) return <MediaSkeleton />;
  if (isError || !media) {
    return (
      <div style={{ paddingTop: "calc(var(--safe-top) + 64px)" }}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div style={accentStyle(media.coverImage.color)}>
      <MediaHeader media={media} />
      <Tabs
        className="sticky top-0 z-20 mt-5 bg-bg/90 backdrop-blur-xl"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: t.media.overview },
          { value: "characters", label: t.media.characters },
          { value: "staff", label: t.media.staff },
          { value: "recommendations", label: t.media.recommendations },
        ]}
      />
      {tab === "overview" && <Overview media={media} onShowCharacters={() => setTab("characters")} />}
      {tab === "characters" && <CharactersTab mediaId={media.id} />}
      {tab === "staff" && <StaffTab mediaId={media.id} />}
      {tab === "recommendations" && <RecommendationsTab media={media} />}
    </div>
  );
}

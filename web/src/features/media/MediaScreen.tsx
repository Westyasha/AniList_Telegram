"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMedia } from "@/api/hooks";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { useQueryParams } from "@/lib/useQueryParams";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";
import { FloatingBack } from "@/components/shell/PageHeader";
import { MediaHeader } from "./MediaHeader";
import { Overview } from "./Overview";
import { CharactersTab, RecommendationsTab, StaffTab } from "./MediaTabs";
import { useAmbient } from "@/components/shell/Ambient";

type TabKey = "overview" | "characters" | "staff" | "recommendations";

const TAB_KEYS: TabKey[] = ["overview", "characters", "staff", "recommendations"];

function MediaSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="w-full" style={{ height: "calc(176px + var(--safe-top))" }} />
      <div className="-mt-24 flex items-end gap-4 px-4">
        <Skeleton className="chamfer aspect-[2/3] w-28 shrink-0 rounded-poster" />
        <div className="flex flex-1 flex-col gap-2 pb-1">
          <Skeleton className="h-5 w-4/5 rounded-[2px]" />
          <Skeleton className="h-3 w-1/2 rounded-[2px]" />
        </div>
      </div>
      <div className="mt-4 flex gap-2 px-4">
        <Skeleton className="h-11 flex-1 rounded-control" />
        <Skeleton className="size-11 rounded-control" />
        <Skeleton className="size-11 rounded-control" />
      </div>
      <div className="mt-8 flex flex-col gap-2 px-4">
        {[92, 84, 88, 60].map((width) => (
          <Skeleton key={width} className="h-3 rounded-[2px]" style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  );
}

export function MediaScreen() {
  const t = useT();
  const pickTitle = useTitle();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { params: search, update } = useQueryParams();
  const tabParam = search.get("tab") as TabKey | null;
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : "overview";
  const { data, isPending, isError, error, refetch } = useMedia(id);
  const media = data?.Media;
  useAmbient(media?.coverImage.large ?? media?.coverImage.medium);

  useEffect(() => {
    if (!media) return;
    document.title = pickTitle(media.title);
    return () => {
      document.title = "AniList";
    };
  }, [media, pickTitle]);

  const setTab = (value: TabKey) => update({ tab: value === "overview" ? null : value });

  if (isPending) return <MediaSkeleton />;
  if (isError || !media) {
    return (
      <div className="relative pt-safe">
        <FloatingBack />
        <ErrorState error={error} onRetry={() => void refetch()} className="pt-24" />
      </div>
    );
  }

  return (
    <div>
      <MediaHeader media={media} />
      <Tabs<TabKey>
        label={t.media.overview}
        className="sticky top-[var(--safe-top)] z-20 mt-6 bg-bg"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: t.media.overview },
          { value: "characters", label: t.media.characters },
          { value: "staff", label: t.media.staff },
          { value: "recommendations", label: t.media.recommendations },
        ]}
      />
      {tab === "overview" ? <Overview media={media} onShowCharacters={() => setTab("characters")} /> : null}
      {tab === "characters" ? <CharactersTab mediaId={media.id} /> : null}
      {tab === "staff" ? <StaffTab mediaId={media.id} /> : null}
      {tab === "recommendations" ? <RecommendationsTab media={media} /> : null}
    </div>
  );
}

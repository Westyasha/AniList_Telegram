"use client";

import { useMemo } from "react";
import { homeVariables, useHome } from "@/api/hooks";
import { useT } from "@/lib/i18n";
import { PageHeader, HeaderActions } from "@/components/shell/PageHeader";
import { Wordmark } from "@/components/brand/Mark";
import { PosterRow } from "@/components/media/PosterRow";
import { ErrorState } from "@/components/ui/States";
import { AiringToday } from "./AiringToday";
import { ContinueWatching } from "./ContinueWatching";
import { Hero } from "./Hero";

export function HomeScreen() {
  const t = useT();
  const { data, isPending, isError, error, refetch } = useHome();
  const vars = useMemo(() => homeVariables(), []);

  if (isError && !data) {
    return (
      <div>
        <PageHeader title={<Wordmark />} actions={<HeaderActions />} />
        <ErrorState error={error} onRetry={() => void refetch()} className="mt-8" />
      </div>
    );
  }

  const heroIds = new Set((data?.trending.media ?? []).filter((media) => media.bannerImage).slice(0, 5).map((media) => media.id));
  const trending = data?.trending.media.filter((media) => !heroIds.has(media.id));

  return (
    <div>
      <Hero items={data?.trending.media} loading={isPending} />
      <div className="flex flex-col gap-8 pt-4">
        <ContinueWatching />
        <AiringToday items={data?.airing.airingSchedules} loading={isPending} />
        <PosterRow title={t.home.trending} items={trending} loading={isPending} href="/search?sort=TRENDING_DESC" />
        <PosterRow
          title={`${t.enums.season[vars.season]} ${vars.seasonYear}`}
          items={data?.season.media}
          loading={isPending}
          href={`/search?season=${vars.season}&year=${vars.seasonYear}`}
        />
        <PosterRow
          title={`${t.enums.season[vars.nextSeason]} ${vars.nextYear}`}
          aside={t.home.nextSeason}
          items={data?.nextSeason.media}
          loading={isPending}
          href={`/search?season=${vars.nextSeason}&year=${vars.nextYear}`}
        />
        <PosterRow title={t.home.allTime} items={data?.popular.media} loading={isPending} href="/search?sort=POPULARITY_DESC" />
        <PosterRow title={t.home.trendingManga} items={data?.manga.media} loading={isPending} href="/search?type=manga&sort=TRENDING_DESC" />
      </div>
    </div>
  );
}

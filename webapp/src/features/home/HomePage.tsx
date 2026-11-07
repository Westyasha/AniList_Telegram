import { useMemo } from "react";
import { homeVariables, useHome } from "@/api/hooks";
import { useViewer } from "@/api/session";
import { useT } from "@/lib/i18n";
import { Wordmark } from "@/components/brand/Logo";
import { HeaderActions, PageHeader } from "@/components/layout/PageHeader";
import { MediaRow } from "@/components/media/MediaRow";
import { ErrorState } from "@/components/ui/States";
import { AiringToday } from "./AiringToday";
import { ContinueWatching } from "./ContinueWatching";
import { HeroCarousel, HeroSkeleton } from "./HeroCarousel";

function Titled({ main, sub }: { main: string; sub: string }) {
  return (
    <>
      {main}
      <span className="ml-2 text-xs font-semibold text-faint">{sub}</span>
    </>
  );
}

export function HomePage() {
  const t = useT();
  const viewer = useViewer();
  const { data, isPending, isError, error, refetch } = useHome();
  const vars = useMemo(() => homeVariables(), []);

  const seasonLabel = `${t.enums.season[vars.season]} ${vars.seasonYear}`;
  const nextLabel = `${t.enums.season[vars.nextSeason]} ${vars.nextYear}`;

  return (
    <div>
      <PageHeader leading={<Wordmark />} actions={<HeaderActions />} />
      {isError && !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} className="mt-10" />
      ) : (
        <div className="flex flex-col gap-7 pt-1">
          {isPending || !data ? <HeroSkeleton /> : <HeroCarousel items={data.trending.media} />}
          {viewer && <ContinueWatching />}
          <AiringToday items={data?.airing.airingSchedules} loading={isPending} />
          <MediaRow title={t.home.trending} items={data?.trending.media} loading={isPending} to="/search?sort=TRENDING_DESC" />
          <MediaRow
            title={<Titled main={t.home.season} sub={seasonLabel} />}
            items={data?.season.media}
            loading={isPending}
            to={`/search?season=${vars.season}&year=${vars.seasonYear}`}
          />
          <MediaRow
            title={<Titled main={t.home.nextSeason} sub={nextLabel} />}
            items={data?.nextSeason.media}
            loading={isPending}
            to={`/search?season=${vars.nextSeason}&year=${vars.nextYear}`}
          />
          <MediaRow title={t.home.allTime} items={data?.popular.media} loading={isPending} to="/search?sort=POPULARITY_DESC" />
          <MediaRow
            title={t.home.trendingManga}
            items={data?.manga.media}
            loading={isPending}
            to="/search?type=manga&sort=TRENDING_DESC"
          />
        </div>
      )}
    </div>
  );
}

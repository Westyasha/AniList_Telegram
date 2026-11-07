import { Link } from "react-router";
import type { AnimeStatistics, MangaStatistics, MediaListStatus, MediaType } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { BarList, ColumnChart, Donut, scoreColor } from "@/components/charts/Charts";
import { Card, Section } from "@/components/ui/Section";
import { Image } from "@/components/ui/Image";
import { STATUS_COLOR, statusLabel } from "@/components/media/status";

const STATUS_ORDER: MediaListStatus[] = ["CURRENT", "COMPLETED", "PLANNING", "PAUSED", "DROPPED", "REPEATING"];

interface StatsProps {
  type: MediaType;
  anime: AnimeStatistics;
  manga: MangaStatistics;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-3.5 py-3">
      <span className="tabular text-[19px] leading-none font-extrabold text-[var(--accent-text)]">{value}</span>
      <span className="text-[11px] font-semibold text-faint">{label}</span>
    </div>
  );
}

export function Overview({ type, anime, manga }: StatsProps) {
  const t = useT();
  const locale = t.locale;
  if (type === "ANIME") {
    const days = anime.minutesWatched / 1440;
    return (
      <div className="grid grid-cols-2 gap-2 px-4">
        <Tile label={t.profile.stats.titles} value={formatNumber(anime.count, locale)} />
        <Tile label={t.profile.stats.daysWatched} value={days.toLocaleString(locale, { maximumFractionDigits: 1 })} />
        <Tile label={t.profile.stats.meanScore} value={anime.meanScore ? anime.meanScore.toLocaleString(locale, { maximumFractionDigits: 1 }) : "—"} />
        <Tile label={t.profile.stats.episodes} value={formatNumber(anime.episodesWatched, locale)} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 px-4">
      <Tile label={t.profile.stats.titles} value={formatNumber(manga.count, locale)} />
      <Tile label={t.profile.stats.chapters} value={formatNumber(manga.chaptersRead, locale)} />
      <Tile label={t.profile.stats.meanScore} value={manga.meanScore ? manga.meanScore.toLocaleString(locale, { maximumFractionDigits: 1 }) : "—"} />
      <Tile label={t.profile.stats.volumes} value={formatNumber(manga.volumesRead, locale)} />
    </div>
  );
}

export function Breakdown({ type, anime, manga }: StatsProps) {
  const t = useT();
  const stats = type === "ANIME" ? anime : manga;
  const statusData = STATUS_ORDER.map((status) => ({
    key: status,
    label: statusLabel(t, type, status),
    value: stats.statuses.find((item) => item.status === status)?.count ?? 0,
    color: STATUS_COLOR[status],
  })).filter((item) => item.value > 0);

  const genreData = stats.genres.slice(0, 8).map((genre) => ({
    key: genre.genre,
    label: genre.genre,
    value: genre.count,
    meanScore: genre.meanScore,
  }));

  if (stats.count === 0) {
    return <p className="mx-4 rounded-xl border border-line bg-surface p-4 text-center text-[13px] text-muted">{t.profile.noStats}</p>;
  }

  return (
    <div className="flex flex-col gap-7">
      {statusData.length > 0 && (
        <Section title={t.profile.statuses}>
          <Card>
            <Donut data={statusData} centerValue={formatNumber(stats.count, t.locale)} centerLabel={t.profile.titlesShort} />
          </Card>
        </Section>
      )}

      {genreData.length > 0 && (
        <Section title={t.profile.genres}>
          <Card>
            <BarList
              data={genreData}
              formatValue={(datum) => {
                const source = genreData.find((item) => item.key === datum.key);
                return source?.meanScore ? `${datum.value} · ${source.meanScore.toFixed(0)}` : String(datum.value);
              }}
            />
          </Card>
        </Section>
      )}

      {type === "ANIME" && <AnimeExtras anime={anime} />}
    </div>
  );
}

function AnimeExtras({ anime }: { anime: AnimeStatistics }) {
  const t = useT();
  const scores = [...anime.scores].filter((item) => item.score > 0).sort((a, b) => a.score - b.score);
  const scoreData = scores.map((item, index) => ({
    key: String(item.score),
    label: String(item.score),
    value: item.count,
    color: scoreColor(index, scores.length),
  }));
  const years = [...anime.releaseYears].sort((a, b) => a.releaseYear - b.releaseYear).slice(-12);
  const yearData = years.map((item) => ({ key: String(item.releaseYear), label: `’${String(item.releaseYear).slice(2)}`, value: item.count }));

  return (
    <>
      {scoreData.length > 1 && (
        <Section title={t.profile.scores}>
          <Card>
            <ColumnChart data={scoreData} height={100} />
          </Card>
        </Section>
      )}
      {yearData.length > 1 && (
        <Section title={t.profile.releaseYears}>
          <Card>
            <ColumnChart data={yearData} height={90} />
          </Card>
        </Section>
      )}
      {anime.studios.length > 0 && (
        <Section title={t.profile.studios}>
          <Card>
            <BarList data={anime.studios.map((item) => ({ key: String(item.studio.id), label: item.studio.name, value: item.count }))} />
          </Card>
        </Section>
      )}
      {anime.voiceActors.length > 0 && (
        <Section title={t.profile.voiceActors} bleed>
          <div className="scroll-row">
            {anime.voiceActors.map((item) => (
              <Link key={item.voiceActor.id} to={`/staff/${item.voiceActor.id}`} className="flex w-[84px] flex-col items-center gap-1.5 text-center">
                <Image src={item.voiceActor.image.medium} alt="" className="size-[68px] rounded-full ring-1 ring-white/10" />
                <span className="line-clamp-2 text-[11.5px] leading-tight font-semibold">{item.voiceActor.name.full}</span>
                <span className="tabular text-[10.5px] font-semibold text-faint">{item.count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

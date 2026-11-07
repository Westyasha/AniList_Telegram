"use client";

import Link from "next/link";
import type { AnimeStatistics, MangaStatistics, MediaListStatus, MediaType, ScoreFormat } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { statusLabel } from "@/lib/status";
import { Section } from "@/components/ui/Section";
import { StatusDot } from "@/components/media/Marks";
import { Avatar } from "@/components/media/Poster";
import { ScoreHistogram, modeIndex, type Bucket } from "@/components/charts/ScoreHistogram";
import { RankedList } from "@/components/charts/RankedList";

const STATUS_ORDER: MediaListStatus[] = ["CURRENT", "REPEATING", "COMPLETED", "PAUSED", "DROPPED", "PLANNING"];
const STATUS_COLOR: Record<MediaListStatus, string> = {
  CURRENT: "var(--color-st-watching)",
  REPEATING: "var(--color-st-repeating)",
  COMPLETED: "var(--color-st-completed)",
  PAUSED: "var(--color-st-paused)",
  DROPPED: "var(--color-st-dropped)",
  PLANNING: "var(--color-st-planning)",
};

interface StatsProps {
  type: MediaType;
  anime: AnimeStatistics;
  manga: MangaStatistics;
  format: ScoreFormat | null;
  accent: string;
}

function scaleOf(format: ScoreFormat | null, max: number): number {
  if (format === "POINT_100") return 100;
  if (format === "POINT_10" || format === "POINT_10_DECIMAL") return max > 10 ? 100 : 10;
  if (format === "POINT_5") return 5;
  if (format === "POINT_3") return 3;
  if (max > 10) return 100;
  if (max > 5) return 10;
  return max > 3 ? 5 : 3;
}

function scoreBuckets(scores: AnimeStatistics["scores"], format: ScoreFormat | null): Bucket[] {
  const valid = scores.filter((item) => item.score > 0);
  if (valid.length === 0) return [];
  const scale = scaleOf(format, Math.max(...valid.map((item) => item.score)));
  const steps = scale === 100 ? 10 : scale;
  const buckets: Bucket[] = Array.from({ length: steps }, (_, index) => {
    const label = String(scale === 100 ? (index + 1) * 10 : index + 1);
    return { key: label, label, value: 0 };
  });
  for (const item of valid) {
    const position = scale === 100 ? Math.ceil(item.score / 10) - 1 : Math.round(item.score) - 1;
    const bucket = buckets[Math.min(steps - 1, Math.max(0, position))];
    bucket.value += item.count;
  }
  return buckets;
}

function figure(value: number, locale: string, digits = 0): string {
  return value.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function Headline({ type, anime, manga }: Omit<StatsProps, "format" | "accent">) {
  const t = useT();
  const locale = t.locale;
  const isAnime = type === "ANIME";
  const days = anime.minutesWatched / 1440;
  const lead = isAnime ? figure(days, locale, 1) : formatNumber(manga.chaptersRead, locale);
  const leadUnit = isAnime ? t.profile.daysUnit(Math.round(days)) : "";
  const mean = isAnime ? anime.meanScore : manga.meanScore;
  const small = isAnime
    ? [
        [t.profile.stats.titles, formatNumber(anime.count, locale)],
        [t.profile.stats.episodes, formatNumber(anime.episodesWatched, locale)],
      ]
    : [
        [t.profile.stats.titles, formatNumber(manga.count, locale)],
        [t.profile.stats.volumes, formatNumber(manga.volumesRead, locale)],
      ];

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-x-6 gap-y-5 px-4">
      <div className="flex flex-col gap-1">
        <span className="text-13 text-fg3">{isAnime ? t.profile.watched : t.profile.read}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-32 leading-none font-medium text-fg tabular-nums">{lead}</span>
          {leadUnit ? <span className="text-15 text-fg2">{leadUnit}</span> : null}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-13 text-fg3">{t.profile.stats.meanScore}</span>
        <span className="text-32 leading-none font-medium text-fg tabular-nums">{mean ? figure(mean, locale, 1) : "—"}</span>
      </div>
      {small.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <span className="text-13 text-fg3">{label}</span>
          <span className="figure text-17 text-fg">{value}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBar({ type, statuses }: { type: MediaType; statuses: { status: MediaListStatus; count: number }[] }) {
  const t = useT();
  const total = statuses.reduce((sum, item) => sum + item.count, 0) || 1;
  return (
    <div className="flex flex-col gap-4 px-4">
      <div
        role="img"
        aria-label={statuses.map((item) => `${statusLabel(t, type, item.status)}: ${item.count}`).join(", ")}
        className="flex h-2 gap-0.5 overflow-hidden rounded-[2px]"
      >
        {statuses.map((item) => (
          <span key={item.status} style={{ flexGrow: item.count, backgroundColor: STATUS_COLOR[item.status] }} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
        {statuses.map((item) => (
          <li key={item.status} className="flex items-center gap-2 text-13">
            <StatusDot status={item.status} />
            <span className="min-w-0 flex-1 truncate text-fg2">{statusLabel(t, type, item.status)}</span>
            <span className="figure text-fg">{formatNumber(item.count, t.locale)}</span>
            <span className="figure w-9 text-right text-fg3">{Math.round((item.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VoiceActors({ items }: { items: AnimeStatistics["voiceActors"] }) {
  const t = useT();
  return (
    <Section title={t.profile.voiceActors} bleed>
      <ul className="scroll-row">
        {items.map((item) => (
          <li key={item.voiceActor.id} className="w-[88px] shrink-0">
            <Link href={`/staff/${item.voiceActor.id}`} className="flex flex-col items-center gap-2 text-center">
              <Avatar src={item.voiceActor.image.medium} alt="" size={72} />
              <span className="line-clamp-2 flex h-9 items-start text-13 leading-tight text-fg">{item.voiceActor.name.full}</span>
              <span className="text-12 text-fg3">{t.profile.roles(item.count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Breakdown({ type, anime, manga, format, accent }: StatsProps) {
  const t = useT();
  const stats = type === "ANIME" ? anime : manga;
  const locale = t.locale;

  if (stats.count === 0) return <p className="px-4 text-15 text-fg2">{t.profile.noStats}</p>;

  const buckets = type === "ANIME" ? scoreBuckets(anime.scores, format) : [];
  const mode = modeIndex(buckets);
  const statuses = STATUS_ORDER.map((status) => ({
    status,
    count: stats.statuses.find((item) => item.status === status)?.count ?? 0,
  })).filter((item) => item.count > 0);
  const genres = stats.genres.slice(0, 6);
  const studios = type === "ANIME" ? anime.studios.slice(0, 5) : [];

  return (
    <div className="flex flex-col gap-10">
      {statuses.length > 0 ? <StatusBar type={type} statuses={statuses} /> : null}

      {buckets.length > 1 && mode >= 0 ? (
        <Section title={t.profile.scores}>
          <ScoreHistogram
            buckets={buckets}
            height={168}
            accent={accent}
            label={t.profile.scores}
            formatValue={(value) => formatNumber(value, locale)}
            caption={t.profile.scoresCaption(buckets[mode].label)}
          />
        </Section>
      ) : null}

      {genres.length > 0 ? (
        <Section title={t.profile.taste} aside={t.profile.tasteCaption(genres[0].genre)}>
          <RankedList
            items={genres.map((genre) => ({
              key: genre.genre,
              label: genre.genre,
              value: genre.count,
              display: formatNumber(genre.count, locale),
              detail: genre.meanScore ? `${Math.round(genre.meanScore)}%` : undefined,
            }))}
          />
        </Section>
      ) : null}

      {type === "ANIME" && anime.voiceActors.length > 0 ? <VoiceActors items={anime.voiceActors} /> : null}

      {studios.length > 0 ? (
        <Section title={t.profile.studios}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-15">
            {studios.map((item) => (
              <li key={item.studio.id} className="flex items-baseline gap-1.5">
                <span className="text-fg">{item.studio.name}</span>
                <span className="figure text-13 text-fg3">{item.count}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

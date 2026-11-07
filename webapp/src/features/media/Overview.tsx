import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ExternalLink as ExternalIcon, Play } from "lucide-react";
import type { ExternalLink, MediaDetails, MediaListStatus } from "@/api/types";
import { useI18n } from "@/lib/i18n";
import { formatFuzzyDate, formatNumber, regionName } from "@/lib/format";
import { openExternal } from "@/lib/telegram";
import { Card, InfoRow, Section } from "@/components/ui/Section";
import { Tag } from "@/components/ui/Chip";
import { Image } from "@/components/ui/Image";
import { MediaCard } from "@/components/media/MediaCard";
import { CharacterVoiceCard } from "@/components/media/PersonCard";
import { RichText } from "@/components/media/RichText";
import { ColumnChart, scoreColor, StackedBar } from "@/components/charts/Charts";
import { STATUS_COLOR, statusLabel } from "@/components/media/status";

const STATUS_ORDER: MediaListStatus[] = ["CURRENT", "PLANNING", "COMPLETED", "PAUSED", "DROPPED", "REPEATING"];

function trailerUrl(trailer: NonNullable<MediaDetails["trailer"]>): string | null {
  if (trailer.site === "youtube") return `https://www.youtube.com/watch?v=${trailer.id}`;
  if (trailer.site === "dailymotion") return `https://www.dailymotion.com/video/${trailer.id}`;
  return null;
}

function LinkChip({ link }: { link: ExternalLink }) {
  const color = link.color ?? "#3a3a46";
  return (
    <button
      type="button"
      onClick={() => openExternal(link.url)}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface-2 pr-3 pl-1.5 text-[12.5px] font-semibold transition-colors hover:bg-surface-3"
    >
      <span className="flex size-7 items-center justify-center rounded-lg" style={{ background: color }}>
        {link.icon ? <img src={link.icon} alt="" className="size-4" loading="lazy" decoding="async" /> : <ExternalIcon className="size-3.5 text-white" />}
      </span>
      {link.site}
      {link.language && <span className="text-[10.5px] text-faint">{link.language.slice(0, 2).toUpperCase()}</span>}
    </button>
  );
}

export function Overview({ media, onShowCharacters }: { media: MediaDetails; onShowCharacters: () => void }) {
  const { t } = useI18n();
  const [showSpoilers, setShowSpoilers] = useState(false);
  const locale = t.locale;
  const isAnime = media.type === "ANIME";
  const searchType = isAnime ? "" : "&type=manga";

  const mainStudios = media.studios.edges.filter((edge) => edge.isMain).map((edge) => edge.node.name);
  const producers = media.studios.edges.filter((edge) => !edge.isMain).map((edge) => edge.node.name);
  const tags = media.tags.filter((tag) => !tag.isMediaSpoiler && !tag.isGeneralSpoiler);
  const spoilerTags = media.tags.filter((tag) => tag.isMediaSpoiler || tag.isGeneralSpoiler);
  const streaming = media.externalLinks.filter((link) => link.type === "STREAMING");
  const otherLinks = media.externalLinks.filter((link) => link.type !== "STREAMING");
  const trailer = media.trailer ? trailerUrl(media.trailer) : null;

  const scoreData = useMemo(() => {
    const dist = media.stats?.scoreDistribution ?? [];
    const buckets = Array.from({ length: 10 }, (_, index) => (index + 1) * 10);
    return buckets.map((score, index) => ({
      key: String(score),
      label: String(score),
      value: dist.find((item) => item.score === score)?.amount ?? 0,
      color: scoreColor(index, buckets.length),
    }));
  }, [media.stats]);

  const statusData = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        key: status,
        label: statusLabel(t, media.type, status),
        value: media.stats?.statusDistribution?.find((item) => item.status === status)?.amount ?? 0,
        color: STATUS_COLOR[status],
      })).filter((item) => item.value > 0),
    [media.stats, media.type, t],
  );

  const info: [string, ReactNode][] = [
    [t.media.info.format, media.format ? t.enums.format[media.format] : null],
    isAnime
      ? [t.media.info.episodes, media.episodes]
      : [t.media.info.chapters, media.chapters],
    [t.media.info.volumes, isAnime ? null : media.volumes],
    [t.media.info.duration, isAnime && media.duration ? t.media.perEpisode(media.duration) : null],
    [t.media.info.status, media.status ? t.enums.status[media.status] : null],
    [t.media.info.startDate, formatFuzzyDate(media.startDate, locale)],
    [t.media.info.endDate, formatFuzzyDate(media.endDate, locale)],
    [t.media.info.season, media.season && media.seasonYear ? `${t.enums.season[media.season]} ${media.seasonYear}` : null],
    [t.media.info.studios, mainStudios.join(", ") || null],
    [t.media.info.producers, producers.slice(0, 4).join(", ") || null],
    [t.media.info.source, media.source ? t.enums.source[media.source] : null],
    [t.media.info.country, regionName(media.countryOfOrigin, locale)],
    [t.media.info.hashtag, media.hashtag],
    [t.media.info.romaji, media.title.romaji],
    [t.media.info.english, media.title.english],
    [t.media.info.native, media.title.native],
  ];

  const relations = media.relations.edges.filter((edge) => !edge.node.isAdult);
  const characters = media.characters.edges.slice(0, 6);

  return (
    <div className="flex flex-col gap-7 pt-5">
      <Section title={t.media.description}>
        <RichText source={media.description} />
      </Section>

      {media.genres.length > 0 && (
        <div className="no-scrollbar -mt-2 flex gap-2 overflow-x-auto px-4">
          {media.genres.map((genre) => (
            <Link
              key={genre}
              to={`/search?genres=${encodeURIComponent(genre)}${searchType}`}
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-[var(--accent-soft)] px-3 text-xs font-semibold text-[var(--accent-text)]"
            >
              {genre}
            </Link>
          ))}
        </div>
      )}

      <Section title={t.media.information}>
        <Card>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            {info
              .filter(([, value]) => value !== null && value !== undefined && value !== "")
              .map(([label, value]) => (
                <InfoRow key={label} label={label}>
                  {typeof value === "number" ? formatNumber(value, locale) : value}
                </InfoRow>
              ))}
          </dl>
          {media.synonyms.length > 0 && (
            <div className="mt-3.5 border-t border-line pt-3.5">
              <InfoRow label={t.media.info.synonyms}>
                <span className="font-medium text-muted">{media.synonyms.slice(0, 6).join(" · ")}</span>
              </InfoRow>
            </div>
          )}
        </Card>
      </Section>

      {relations.length > 0 && (
        <Section title={t.media.relations} bleed>
          <div className="scroll-row pb-1">
            {relations.map((edge) => (
              <MediaCard
                key={edge.id}
                media={edge.node}
                className="w-[108px]"
                caption={edge.relationType ? t.enums.relation[edge.relationType] : undefined}
              />
            ))}
          </div>
        </Section>
      )}

      {characters.length > 0 && (
        <Section
          title={t.media.characters}
          action={
            <button type="button" onClick={onShowCharacters} className="-mr-2 h-9 rounded-lg px-2 text-xs font-semibold text-muted hover:text-fg">
              {t.common.seeAll}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-2">
            {characters.map((edge) => (
              <CharacterVoiceCard key={edge.node.id} edge={edge} />
            ))}
          </div>
        </Section>
      )}

      {(tags.length > 0 || spoilerTags.length > 0) && (
        <Section title={t.media.tags}>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Tag key={tag.id}>
                {tag.name}
                {tag.rank != null && <span className="tabular text-faint">{tag.rank}%</span>}
              </Tag>
            ))}
            {showSpoilers &&
              spoilerTags.map((tag) => (
                <Tag key={tag.id} className="bg-dropped/10 text-dropped">
                  {tag.name}
                  {tag.rank != null && <span className="tabular text-dropped/60">{tag.rank}%</span>}
                </Tag>
              ))}
          </div>
          {spoilerTags.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSpoilers((value) => !value)}
              className="mt-2 h-10 text-[12.5px] font-semibold text-[var(--accent-text)]"
            >
              {showSpoilers ? t.media.hideSpoilers : t.media.showSpoilers(spoilerTags.length)}
            </button>
          )}
        </Section>
      )}

      {trailer && media.trailer && (
        <Section title={t.media.trailer}>
          <button
            type="button"
            onClick={() => openExternal(trailer)}
            className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-line"
            aria-label={t.media.trailer}
          >
            <Image src={media.trailer.thumbnail} alt="" color={media.coverImage.color} className="absolute inset-0" />
            <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/25" />
            <span className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_30px_-8px_rgba(224,35,61,0.8)]">
              <Play className="ml-0.5 size-6 fill-current" />
            </span>
          </button>
        </Section>
      )}

      {streaming.length > 0 && (
        <Section title={t.media.streaming} bleed>
          <div className="scroll-row">
            {streaming.map((link) => (
              <LinkChip key={link.id} link={link} />
            ))}
          </div>
        </Section>
      )}

      {otherLinks.length > 0 && (
        <Section title={t.media.links} bleed>
          <div className="scroll-row">
            {otherLinks.map((link) => (
              <LinkChip key={link.id} link={link} />
            ))}
          </div>
        </Section>
      )}

      {statusData.length > 0 && (
        <Section title={t.media.statusDistribution}>
          <Card>
            <StackedBar data={statusData} formatValue={(value) => formatNumber(value, locale)} />
          </Card>
        </Section>
      )}

      {scoreData.some((item) => item.value > 0) && (
        <Section title={t.media.scoreDistribution}>
          <Card>
            <ColumnChart data={scoreData} height={110} formatValue={(value) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value))} />
          </Card>
        </Section>
      )}
    </div>
  );
}

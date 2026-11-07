"use client";

import { useMemo, useState } from "react";
import { ExternalLink as ExternalIcon, Play } from "lucide-react";
import type { ExternalLink, MediaDetails } from "@/api/types";
import { useT } from "@/lib/i18n";
import { formatCompact, formatFuzzyDate, formatNumber, regionName } from "@/lib/format";
import { openExternal } from "@/lib/telegram";
import { Section } from "@/components/ui/Section";
import { LinkChip, TextChip } from "@/components/ui/Chip";
import { DefinitionList, type Definition } from "@/components/ui/DefinitionList";
import { Icon } from "@/components/ui/Icon";
import { Figures } from "@/components/ui/Figures";
import { RichText } from "@/components/media/RichText";
import { PosterRow } from "@/components/media/PosterRow";
import { PersonTile } from "@/components/media/PersonTile";
import { ScoreHistogram, modeIndex, type Bucket } from "@/components/charts/ScoreHistogram";

function trailerUrl(trailer: NonNullable<MediaDetails["trailer"]>): string | null {
  if (trailer.site === "youtube") return `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.id)}`;
  if (trailer.site === "dailymotion") return `https://www.dailymotion.com/video/${encodeURIComponent(trailer.id)}`;
  return null;
}

function LinkRow({ label, detail, onClick, trailing }: { label: string; detail?: string | null; onClick: () => void; trailing: typeof ExternalIcon }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex h-12 w-full items-center gap-3 border-b border-line text-left transition-colors hover:text-fg">
        <span className="min-w-0 flex-1 truncate text-15 text-fg">{label}</span>
        {detail ? <span className="figure text-12 text-fg3">{detail}</span> : null}
        <Icon icon={trailing} className="text-fg3" />
      </button>
    </li>
  );
}

function linkDetail(link: ExternalLink): string | null {
  return link.language ? link.language.slice(0, 2).toUpperCase() : null;
}

export function Overview({ media, onShowCharacters }: { media: MediaDetails; onShowCharacters: () => void }) {
  const t = useT();
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
  const relations = media.relations.edges.filter((edge) => !edge.node.isAdult);
  const relationType = new Map(relations.map((edge) => [edge.node.id, edge.relationType]));
  const characters = media.characters.edges.slice(0, 6);
  const recommendations = media.recommendations.nodes
    .map((node) => node.mediaRecommendation)
    .filter((item): item is NonNullable<typeof item> => Boolean(item && !item.isAdult));

  const buckets = useMemo<Bucket[]>(() => {
    const dist = media.stats?.scoreDistribution ?? [];
    return Array.from({ length: 10 }, (_, index) => {
      const score = (index + 1) * 10;
      return { key: String(score), label: String(score), value: dist.find((item) => item.score === score)?.amount ?? 0 };
    });
  }, [media.stats]);
  const totalRatings = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const mode = modeIndex(buckets);

  const info: Definition[] = [
    [t.media.info.format, media.format ? t.enums.format[media.format] : null],
    [isAnime ? t.media.info.episodes : t.media.info.chapters, (isAnime ? media.episodes : media.chapters) ? <span className="figure">{formatNumber(isAnime ? media.episodes : media.chapters, locale)}</span> : null],
    [t.media.info.volumes, !isAnime && media.volumes ? <span className="figure">{formatNumber(media.volumes, locale)}</span> : null],
    [t.media.info.duration, isAnime && media.duration ? <span className="figure">{t.media.perEpisode(media.duration)}</span> : null],
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
    [t.media.info.synonyms, media.synonyms.length ? media.synonyms.slice(0, 4).join(", ") : null],
  ];

  return (
    <div className="flex flex-col gap-8 pt-6">
      <section className="flex flex-col gap-4 px-4">
        <h2 className="sr-only">{t.media.description}</h2>
        <RichText source={media.description} />
        {media.genres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {media.genres.map((genre) => (
              <LinkChip key={genre} href={`/search?genres=${encodeURIComponent(genre)}${searchType}`}>
                {genre}
              </LinkChip>
            ))}
          </div>
        ) : null}
      </section>

      <Section title={t.media.information}>
        <DefinitionList rows={info} />
      </Section>

      <PosterRow
        title={t.media.relations}
        items={relations.map((edge) => edge.node)}
        captions={(item) => {
          const type = relationType.get(item.id);
          return type ? t.enums.relation[type] : undefined;
        }}
      />

      {characters.length > 0 ? (
        <Section
          title={t.media.characters}
          action={
            <button type="button" onClick={onShowCharacters} className="-mr-2 h-11 rounded-control px-3 text-13 text-fg2 transition-colors hover:text-fg">
              {t.common.seeAll}
            </button>
          }
        >
          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {characters.map((edge) => (
              <PersonTile
                key={edge.node.id}
                href={`/character/${edge.node.id}`}
                name={edge.node.name}
                image={edge.node.image}
                subtitle={edge.role ? t.enums.role[edge.role] : null}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {totalRatings > 0 ? (
        <Section title={t.media.scoreDistribution} aside={<Figures text={t.media.ratings(formatCompact(totalRatings, locale))} />}>
          <ScoreHistogram
            buckets={buckets}
            label={t.media.scoreDistribution}
            formatValue={(value) => formatCompact(value, locale)}
            caption={mode >= 0 ? t.profile.scoresCaption(buckets[mode].label) : undefined}
          />
        </Section>
      ) : null}

      {streaming.length > 0 || trailer ? (
        <Section title={t.media.streaming}>
          <ul className="border-t border-line">
            {trailer ? <LinkRow label={t.media.trailer} detail={media.trailer?.site === "youtube" ? "YouTube" : media.trailer?.site} onClick={() => openExternal(trailer)} trailing={Play} /> : null}
            {streaming.map((link) => (
              <LinkRow key={link.id} label={link.site} detail={linkDetail(link)} onClick={() => openExternal(link.url)} trailing={ExternalIcon} />
            ))}
          </ul>
        </Section>
      ) : null}

      <PosterRow title={t.media.recommendations} items={recommendations} />

      {tags.length > 0 || spoilerTags.length > 0 ? (
        <Section title={t.media.tags}>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TextChip key={tag.id}>
                {tag.name}
                {tag.rank != null ? <span className="figure text-12 text-fg3">{tag.rank}%</span> : null}
              </TextChip>
            ))}
            {showSpoilers
              ? spoilerTags.map((tag) => (
                  <TextChip key={tag.id} className="text-score-low">
                    {tag.name}
                    {tag.rank != null ? <span className="figure text-12 text-fg3">{tag.rank}%</span> : null}
                  </TextChip>
                ))
              : null}
          </div>
          {spoilerTags.length > 0 ? (
            <button type="button" onClick={() => setShowSpoilers((value) => !value)} className="mt-2 h-11 text-13 text-fg2 transition-colors hover:text-fg">
              {showSpoilers ? t.media.hideSpoilers : t.media.showSpoilers(spoilerTags.length)}
            </button>
          ) : null}
        </Section>
      ) : null}

      {otherLinks.length > 0 ? (
        <Section title={t.media.links}>
          <ul className="border-t border-line">
            {otherLinks.map((link) => (
              <LinkRow key={link.id} label={link.site} detail={linkDetail(link)} onClick={() => openExternal(link.url)} trailing={ExternalIcon} />
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

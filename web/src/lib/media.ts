import type { MediaCard, MediaFormat, MediaSeason, MediaStatus, MediaType, NextAiringEpisode } from "@/api/types";
import type { Dict } from "./i18n";

interface Countable {
  type: MediaType;
  episodes: number | null;
  chapters: number | null;
  status: MediaStatus | null;
  nextAiringEpisode: NextAiringEpisode | null;
}

export function totalUnits(media: Pick<Countable, "type" | "episodes" | "chapters">): number | null {
  return media.type === "ANIME" ? media.episodes : media.chapters;
}

export function airedUnits(media: Countable): number | null {
  if (media.nextAiringEpisode) return Math.max(0, media.nextAiringEpisode.episode - 1);
  if (media.status === "FINISHED") return totalUnits(media);
  return null;
}

interface Describable {
  type: MediaType;
  format: MediaFormat | null;
  episodes: number | null;
  chapters: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  startDate: { year: number | null };
}

export function mediaMeta(media: Describable, t: Dict, options: { units?: boolean; season?: boolean } = {}): string {
  const { units = true, season = true } = options;
  const parts: string[] = [];
  if (media.format) parts.push(t.enums.format[media.format]);
  const year = media.seasonYear ?? media.startDate.year;
  if (season && media.season && media.seasonYear) parts.push(`${t.enums.season[media.season]} ${media.seasonYear}`);
  else if (year) parts.push(String(year));
  const total = totalUnits(media);
  if (units && total) parts.push(media.type === "ANIME" ? t.common.episodes(total) : t.common.chapters(total));
  return parts.join(", ");
}

export function coverOf(media: Pick<MediaCard, "coverImage">, size: "small" | "large" = "large"): string | null {
  const { extraLarge, large, medium } = media.coverImage;
  return size === "large" ? (extraLarge ?? large ?? medium) : (large ?? medium ?? extraLarge);
}

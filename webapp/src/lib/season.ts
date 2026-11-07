import type { MediaSeason } from "@/api/types";

export const SEASONS: MediaSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

export interface SeasonRef {
  season: MediaSeason;
  year: number;
}

export function seasonOf(date: Date = new Date()): SeasonRef {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month === 11) return { season: "WINTER", year: year + 1 };
  if (month <= 1) return { season: "WINTER", year };
  if (month <= 4) return { season: "SPRING", year };
  if (month <= 7) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

export function nextSeasonOf(ref: SeasonRef): SeasonRef {
  const index = SEASONS.indexOf(ref.season);
  if (index === SEASONS.length - 1) return { season: SEASONS[0], year: ref.year + 1 };
  return { season: SEASONS[index + 1], year: ref.year };
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayBounds(date: Date = new Date()): { from: number; to: number } {
  const start = startOfDay(date);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return { from: Math.floor(start.getTime() / 1000) - 1, to: Math.floor(end.getTime() / 1000) };
}

export function weekFrom(date: Date = new Date()): Date[] {
  const start = startOfDay(date);
  return Array.from({ length: 7 }, (_, offset) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset));
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

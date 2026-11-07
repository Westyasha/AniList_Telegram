import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { MediaFormat, MediaSeason, MediaSort, MediaStatus, MediaType, SearchMediaVariables } from "@/api/types";

export type SearchKind = "anime" | "manga" | "characters" | "staff" | "users";

export const SEARCH_KINDS: SearchKind[] = ["anime", "manga", "characters", "staff", "users"];

export const ANIME_FORMATS: MediaFormat[] = ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"];
export const MANGA_FORMATS: MediaFormat[] = ["MANGA", "NOVEL", "ONE_SHOT"];
export const MEDIA_STATUSES: MediaStatus[] = ["RELEASING", "FINISHED", "NOT_YET_RELEASED", "HIATUS", "CANCELLED"];
export const SORTS: MediaSort[] = ["POPULARITY_DESC", "TRENDING_DESC", "SCORE_DESC", "START_DATE_DESC", "FAVOURITES_DESC", "TITLE_ROMAJI"];

export interface MediaFilters {
  genres: string[];
  year: number | null;
  season: MediaSeason | null;
  formats: MediaFormat[];
  status: MediaStatus | null;
  minScore: number;
  sort: MediaSort | null;
}

export const EMPTY_FILTERS: MediaFilters = {
  genres: [],
  year: null,
  season: null,
  formats: [],
  status: null,
  minScore: 0,
  sort: null,
};

function list<T extends string>(value: string | null): T[] {
  return value ? (value.split(",").filter(Boolean) as T[]) : [];
}

export function countFilters(filters: MediaFilters): number {
  return (
    filters.genres.length +
    filters.formats.length +
    (filters.year ? 1 : 0) +
    (filters.season ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.minScore > 0 ? 1 : 0)
  );
}

export function useSearchState() {
  const [params, setParams] = useSearchParams();

  const kind = (SEARCH_KINDS.includes(params.get("type") as SearchKind) ? params.get("type") : "anime") as SearchKind;
  const query = params.get("q") ?? "";

  const filters = useMemo<MediaFilters>(
    () => ({
      genres: list<string>(params.get("genres")),
      year: params.get("year") ? Number(params.get("year")) : null,
      season: (params.get("season") as MediaSeason | null) ?? null,
      formats: list<MediaFormat>(params.get("formats")),
      status: (params.get("status") as MediaStatus | null) ?? null,
      minScore: Number(params.get("minScore") ?? 0) || 0,
      sort: (params.get("sort") as MediaSort | null) ?? null,
    }),
    [params],
  );

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === "") next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setKind = useCallback(
    (value: SearchKind) => {
      const patch: Record<string, string | null> = { type: value === "anime" ? null : value };
      if (value !== "anime" && value !== "manga") {
        Object.assign(patch, { genres: null, year: null, season: null, formats: null, status: null, minScore: null, sort: null });
      }
      if (value === "manga") Object.assign(patch, { season: null, formats: null });
      update(patch);
    },
    [update],
  );

  const setQuery = useCallback((value: string) => update({ q: value.trim() ? value : null }), [update]);

  const setFilters = useCallback(
    (next: MediaFilters) =>
      update({
        genres: next.genres.join(",") || null,
        year: next.year ? String(next.year) : null,
        season: next.season,
        formats: next.formats.join(",") || null,
        status: next.status,
        minScore: next.minScore > 0 ? String(next.minScore) : null,
        sort: next.sort,
      }),
    [update],
  );

  return { kind, query, filters, setKind, setQuery, setFilters };
}

export function toVariables(kind: "anime" | "manga", query: string, filters: MediaFilters): SearchMediaVariables {
  const type: MediaType = kind === "anime" ? "ANIME" : "MANGA";
  const search = query.trim() || undefined;
  const sort: MediaSort = filters.sort ?? (search ? "SEARCH_MATCH" : "POPULARITY_DESC");
  const season = type === "ANIME" ? filters.season ?? undefined : undefined;
  return {
    type,
    search,
    sort: sort === "SEARCH_MATCH" ? ["SEARCH_MATCH", "POPULARITY_DESC"] : [sort],
    genres: filters.genres.length ? filters.genres : undefined,
    formats: filters.formats.length ? filters.formats : undefined,
    status: filters.status ?? undefined,
    minScore: filters.minScore > 0 ? filters.minScore : undefined,
    season,
    seasonYear: season && filters.year ? filters.year : undefined,
    year: filters.year && !season ? `${filters.year}%` : undefined,
  };
}

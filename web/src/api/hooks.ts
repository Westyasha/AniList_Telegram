import { useEffect, useMemo } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { gql } from "./client";
import { useViewer } from "./session";
import { isKnownNode } from "./types";
import type {
  Activity,
  AppNotification,
  CollectionEntry,
  HomeVariables,
  MediaType,
  OperationName,
  OpVariables,
  SearchMediaVariables,
  SearchPageVariables,
} from "./types";
import { dayBounds, nextSeasonOf, seasonOf } from "@/lib/season";

const MINUTE = 60_000;

export function gqlKey<K extends OperationName>(op: K, variables?: OpVariables<K>) {
  return ["gql", op, variables ?? {}] as const;
}

export function opKey(op: OperationName) {
  return ["gql", op] as const;
}

function viewerScope(viewerId: number | undefined) {
  return viewerId ?? 0;
}

export function homeVariables(now: Date = new Date()): HomeVariables {
  const current = seasonOf(now);
  const next = nextSeasonOf(current);
  const { from, to } = dayBounds(now);
  return {
    season: current.season,
    seasonYear: current.year,
    nextSeason: next.season,
    nextYear: next.year,
    airingFrom: from,
    airingTo: to,
  };
}

export function useHome() {
  const variables = useMemo(() => homeVariables(), []);
  return useQuery({
    queryKey: gqlKey("Home", variables),
    queryFn: ({ signal }) => gql("Home", variables, { signal }),
    staleTime: 5 * MINUTE,
  });
}

export function useGenres() {
  return useQuery({
    queryKey: gqlKey("Genres"),
    queryFn: ({ signal }) => gql("Genres", undefined, { signal }),
    staleTime: 24 * 60 * MINUTE,
    gcTime: 24 * 60 * MINUTE,
  });
}

export function useSearchMedia(variables: SearchMediaVariables, enabled = true) {
  return useInfiniteQuery({
    queryKey: gqlKey("SearchMedia", variables),
    queryFn: ({ pageParam, signal }) => gql("SearchMedia", { ...variables, page: pageParam, perPage: 30 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Page.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 3 * MINUTE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSearchCharacters(variables: SearchPageVariables, enabled = true) {
  return useInfiniteQuery({
    queryKey: gqlKey("SearchCharacters", variables),
    queryFn: ({ pageParam, signal }) => gql("SearchCharacters", { ...variables, page: pageParam, perPage: 30 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Page.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 3 * MINUTE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSearchStaff(variables: SearchPageVariables, enabled = true) {
  return useInfiniteQuery({
    queryKey: gqlKey("SearchStaff", variables),
    queryFn: ({ pageParam, signal }) => gql("SearchStaff", { ...variables, page: pageParam, perPage: 30 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Page.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 3 * MINUTE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSearchUsers(variables: SearchPageVariables, enabled = true) {
  return useInfiniteQuery({
    queryKey: gqlKey("SearchUsers", variables),
    queryFn: ({ pageParam, signal }) => gql("SearchUsers", { ...variables, page: pageParam, perPage: 30 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Page.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 3 * MINUTE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function mediaKey(id: number, viewerId: number | undefined) {
  return ["gql", "Media", { id }, viewerScope(viewerId)] as const;
}

export function useMedia(id: number) {
  const viewer = useViewer();
  return useQuery({
    queryKey: mediaKey(id, viewer?.id),
    queryFn: ({ signal }) => gql("Media", { id }, { signal }),
    staleTime: 5 * MINUTE,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useMediaCharacters(id: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: gqlKey("MediaCharacters", { id }),
    queryFn: ({ pageParam, signal }) => gql("MediaCharacters", { id, page: pageParam, perPage: 25 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Media.characters.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 10 * MINUTE,
    enabled,
  });
}

export function useMediaStaff(id: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: gqlKey("MediaStaff", { id }),
    queryFn: ({ pageParam, signal }) => gql("MediaStaff", { id, page: pageParam, perPage: 25 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Media.staff.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 10 * MINUTE,
    enabled,
  });
}

export function characterKey(id: number, viewerId: number | undefined) {
  return ["gql", "Character", { id }, viewerScope(viewerId)] as const;
}

export function useCharacter(id: number) {
  const viewer = useViewer();
  return useInfiniteQuery({
    queryKey: characterKey(id, viewer?.id),
    queryFn: ({ pageParam, signal }) => gql("Character", { id, page: pageParam }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Character.media.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 10 * MINUTE,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function staffKey(id: number, viewerId: number | undefined) {
  return ["gql", "Staff", { id }, viewerScope(viewerId)] as const;
}

export function useStaff(id: number) {
  const viewer = useViewer();
  return useInfiniteQuery({
    queryKey: staffKey(id, viewer?.id),
    queryFn: ({ pageParam, signal }) => gql("Staff", { id, page: pageParam }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Staff.staffMedia.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 10 * MINUTE,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useSchedule(from: number, to: number) {
  const viewer = useViewer();
  const query = useInfiniteQuery({
    queryKey: [...gqlKey("Schedule", { from, to }), viewerScope(viewer?.id)] as const,
    queryFn: ({ pageParam, signal }) => gql("Schedule", { from, to, page: pageParam, perPage: 50 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Page.pageInfo.hasNextPage && pages.length < 6 ? pages.length + 1 : undefined),
    staleTime: 5 * MINUTE,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const items = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.Page.airingSchedules).filter((item) => item.media && !item.media.isAdult),
    [query.data],
  );
  return { ...query, items };
}

export function userProfileKey(ref: { id?: number; name?: string }, viewerId: number | undefined) {
  return ["gql", "UserProfile", ref, viewerScope(viewerId)] as const;
}

export function useUserProfile(ref: { id?: number; name?: string }) {
  const viewer = useViewer();
  const enabled = Boolean(ref.id || ref.name);
  return useQuery({
    queryKey: userProfileKey(ref, viewer?.id),
    queryFn: ({ signal }) => gql("UserProfile", ref, { signal }),
    staleTime: 2 * MINUTE,
    enabled,
  });
}

export function useUserActivity(userId: number | undefined) {
  const query = useInfiniteQuery({
    queryKey: gqlKey("UserActivity", { userId: userId ?? 0 }),
    queryFn: ({ pageParam, signal }) => gql("UserActivity", { userId: userId ?? 0, page: pageParam, perPage: 15 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Page.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: MINUTE,
    enabled: Boolean(userId),
  });
  const items = useMemo(
    () =>
      (query.data?.pages ?? [])
        .flatMap((page) => page.Page.activities)
        .filter((item): item is Activity => isKnownNode(item)),
    [query.data],
  );
  return { ...query, items };
}

export function collectionKey(userId: number, type: MediaType) {
  return gqlKey("MediaListCollection", { userId, type });
}

export function useMediaListCollection(userId: number | undefined, type: MediaType, enabled = true) {
  const query = useQuery({
    queryKey: collectionKey(userId ?? 0, type),
    queryFn: ({ signal }) => gql("MediaListCollection", { userId: userId ?? 0, type }, { signal }),
    staleTime: MINUTE,
    enabled: Boolean(userId) && enabled,
  });
  const entries = useMemo(() => flattenCollection(query.data?.MediaListCollection?.lists), [query.data]);
  return { ...query, entries };
}

export function flattenCollection(lists: { isCustomList: boolean; entries: CollectionEntry[] }[] | null | undefined): CollectionEntry[] {
  if (!lists) return [];
  const seen = new Set<number>();
  const out: CollectionEntry[] = [];
  for (const list of lists) {
    if (list.isCustomList) continue;
    for (const entry of list.entries) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(entry);
    }
  }
  return out;
}

export function useViewerCollection(type: MediaType, enabled = true) {
  const viewer = useViewer();
  return useMediaListCollection(viewer?.id, type, enabled);
}

export function useViewerBrief() {
  const viewer = useViewer();
  return useQuery({
    queryKey: [...gqlKey("ViewerBrief"), viewerScope(viewer?.id)] as const,
    queryFn: ({ signal }) => gql("ViewerBrief", undefined, { signal }),
    staleTime: 2 * MINUTE,
    enabled: Boolean(viewer),
  });
}

export function useNotifications(enabled: boolean) {
  const viewer = useViewer();
  const query = useInfiniteQuery({
    queryKey: [...gqlKey("Notifications"), viewerScope(viewer?.id)] as const,
    queryFn: ({ pageParam, signal }) =>
      gql("Notifications", { page: pageParam, perPage: 25, reset: pageParam === 1 }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.Page.pageInfo.hasNextPage ? pages.length + 1 : undefined),
    staleTime: 0,
    gcTime: 0,
    enabled: enabled && Boolean(viewer),
  });
  const items = useMemo(
    () =>
      (query.data?.pages ?? [])
        .flatMap((page) => page.Page.notifications)
        .filter((item): item is AppNotification => isKnownNode(item)),
    [query.data],
  );
  return { ...query, items };
}

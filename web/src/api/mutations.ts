import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { gql } from "./client";
import { opKey } from "./hooks";
import { isKnownNode } from "./types";
import type {
  CharacterData,
  ListEntry,
  MediaBriefData,
  MediaData,
  MediaListCollectionData,
  MediaListStatus,
  MediaType,
  SaveEntryVariables,
  StaffData,
  UserActivityData,
  UserProfileData,
} from "./types";
import { hasFuzzy, todayFuzzy } from "@/lib/format";
import { haptic } from "@/lib/telegram";

type EntryPatch = (entry: ListEntry | null) => ListEntry | null;

function patchMediaCaches(client: QueryClient, mediaId: number, patch: EntryPatch): void {
  client.setQueriesData<MediaData>({ queryKey: ["gql", "Media", { id: mediaId }] }, (data) =>
    data ? { Media: { ...data.Media, mediaListEntry: patch(data.Media.mediaListEntry) } } : data,
  );
  client.setQueriesData<MediaBriefData>({ queryKey: ["gql", "MediaBrief", { id: mediaId }] }, (data) =>
    data ? { Media: { ...data.Media, mediaListEntry: patch(data.Media.mediaListEntry) } } : data,
  );
}

function patchCollections(client: QueryClient, mediaId: number, patch: EntryPatch): boolean {
  let found = false;
  client.setQueriesData<MediaListCollectionData>({ queryKey: opKey("MediaListCollection") }, (data) => {
    if (!data?.MediaListCollection) return data;
    return {
      MediaListCollection: {
        ...data.MediaListCollection,
        lists: data.MediaListCollection.lists.map((list) => ({
          ...list,
          entries: list.entries.flatMap((entry) => {
            if (entry.mediaId !== mediaId) return [entry];
            found = true;
            const next = patch(entry);
            return next ? [{ ...entry, ...next, media: entry.media }] : [];
          }),
        })),
      },
    };
  });
  return found;
}

function snapshot(client: QueryClient) {
  return [
    ...client.getQueriesData({ queryKey: opKey("MediaListCollection") }),
    ...client.getQueriesData({ queryKey: opKey("Media") }),
    ...client.getQueriesData({ queryKey: opKey("MediaBrief") }),
  ];
}

function restore(client: QueryClient, saved: ReturnType<typeof snapshot>): void {
  saved.forEach(([key, data]) => client.setQueryData(key, data));
}

function invalidateDerived(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: opKey("Schedule") });
  void client.invalidateQueries({ queryKey: opKey("UserProfile") });
  void client.invalidateQueries({ queryKey: opKey("UserActivity") });
}

function applySaved(client: QueryClient, saved: ListEntry): void {
  patchMediaCaches(client, saved.mediaId, () => saved);
  const found = patchCollections(client, saved.mediaId, (entry) => (entry ? { ...entry, ...saved } : saved));
  const moved = client
    .getQueriesData<MediaListCollectionData>({ queryKey: opKey("MediaListCollection") })
    .some(([, data]) =>
      data?.MediaListCollection?.lists.some(
        (list) => !list.isCustomList && list.status !== saved.status && list.entries.some((entry) => entry.mediaId === saved.mediaId),
      ),
    );
  if (!found || moved) void client.invalidateQueries({ queryKey: opKey("MediaListCollection") });
  invalidateDerived(client);
}

export function useSaveEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (variables: SaveEntryVariables) => gql("SaveEntry", variables, { raw: true }),
    onSuccess: (data) => applySaved(client, data.SaveMediaListEntry),
  });
}

export function useDeleteEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; mediaId: number }) => gql("DeleteEntry", { id: input.id }, { raw: true }),
    onSuccess: (_data, input) => {
      patchMediaCaches(client, input.mediaId, () => null);
      patchCollections(client, input.mediaId, () => null);
      invalidateDerived(client);
    },
  });
}

export interface ProgressTarget {
  entry: ListEntry;
  media: { id: number; type: MediaType; episodes: number | null; chapters: number | null };
}

export function nextProgress({ entry, media }: ProgressTarget): SaveEntryVariables | null {
  const max = media.type === "ANIME" ? media.episodes : media.chapters;
  const current = entry.progress ?? 0;
  const next = current + 1;
  if (max && next > max) return null;
  const completes = Boolean(max && next >= max);
  const today = todayFuzzy();
  const variables: SaveEntryVariables = { id: entry.id, mediaId: media.id, progress: next };
  let status: MediaListStatus | undefined;
  if (completes) status = "COMPLETED";
  else if (entry.status === "PLANNING" || entry.status === "PAUSED" || entry.status === "DROPPED") status = "CURRENT";
  if (status) variables.status = status;
  if (completes && !hasFuzzy(entry.completedAt)) variables.completedAt = today;
  if (completes && entry.status === "REPEATING") variables.repeat = (entry.repeat ?? 0) + 1;
  if (current === 0 && !hasFuzzy(entry.startedAt)) variables.startedAt = today;
  return variables;
}

export function useIncrementProgress(onDone?: (result: { completed: boolean; progress: number }) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (variables: SaveEntryVariables) => gql("SaveEntry", variables, { raw: true }),
    onMutate: async (variables) => {
      haptic.impact("light");
      await client.cancelQueries({ queryKey: opKey("MediaListCollection") });
      const saved = snapshot(client);
      const patch: EntryPatch = (entry) =>
        entry
          ? {
              ...entry,
              progress: variables.progress ?? entry.progress,
              status: variables.status ?? entry.status,
              repeat: variables.repeat ?? entry.repeat,
              updatedAt: Math.floor(Date.now() / 1000),
            }
          : entry;
      patchCollections(client, variables.mediaId, patch);
      patchMediaCaches(client, variables.mediaId, patch);
      return { saved };
    },
    onError: (_error, _variables, context) => {
      haptic.notify("error");
      if (context) restore(client, context.saved);
    },
    onSuccess: (data, variables) => {
      const completed = variables.status === "COMPLETED";
      if (completed) haptic.notify("success");
      patchMediaCaches(client, data.SaveMediaListEntry.mediaId, () => data.SaveMediaListEntry);
      patchCollections(client, data.SaveMediaListEntry.mediaId, (entry) => (entry ? { ...entry, ...data.SaveMediaListEntry } : entry));
      if (completed) void client.invalidateQueries({ queryKey: opKey("MediaListCollection") });
      invalidateDerived(client);
      onDone?.({ completed, progress: data.SaveMediaListEntry.progress ?? variables.progress ?? 0 });
    },
  });
}

export type FavouriteKind = "anime" | "manga" | "character" | "staff";

export function useToggleFavourite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: FavouriteKind; id: number }) => {
      const key = { anime: "animeId", manga: "mangaId", character: "characterId", staff: "staffId" }[kind];
      return gql("ToggleFavourite", { [key]: id }, { raw: true });
    },
    onMutate: ({ kind, id }) => {
      haptic.selection();
      const flip = <T extends { isFavourite: boolean; favourites: number | null }>(item: T): T => ({
        ...item,
        isFavourite: !item.isFavourite,
        favourites: Math.max(0, (item.favourites ?? 0) + (item.isFavourite ? -1 : 1)),
      });
      const saved = [
        ...client.getQueriesData({ queryKey: ["gql", "Media", { id }] }),
        ...client.getQueriesData({ queryKey: ["gql", "Character", { id }] }),
        ...client.getQueriesData({ queryKey: ["gql", "Staff", { id }] }),
      ];
      if (kind === "anime" || kind === "manga") {
        client.setQueriesData<MediaData>({ queryKey: ["gql", "Media", { id }] }, (data) => (data ? { Media: flip(data.Media) } : data));
      }
      if (kind === "character") {
        client.setQueriesData<InfiniteData<CharacterData>>({ queryKey: ["gql", "Character", { id }] }, (data) =>
          data ? { ...data, pages: data.pages.map((page) => ({ Character: flip(page.Character) })) } : data,
        );
      }
      if (kind === "staff") {
        client.setQueriesData<InfiniteData<StaffData>>({ queryKey: ["gql", "Staff", { id }] }, (data) =>
          data ? { ...data, pages: data.pages.map((page) => ({ Staff: flip(page.Staff) })) } : data,
        );
      }
      return { saved };
    },
    onError: (_error, _input, context) => {
      haptic.notify("error");
      context?.saved.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => void client.invalidateQueries({ queryKey: opKey("UserProfile") }),
  });
}

export function useToggleFollow() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => gql("ToggleFollow", { userId }, { raw: true }),
    onMutate: (userId) => {
      haptic.selection();
      const saved = client.getQueriesData<UserProfileData>({ queryKey: opKey("UserProfile") });
      client.setQueriesData<UserProfileData>({ queryKey: opKey("UserProfile") }, (data) =>
        data && data.User.id === userId ? { User: { ...data.User, isFollowing: !data.User.isFollowing } } : data,
      );
      return { saved };
    },
    onError: (_error, _userId, context) => {
      haptic.notify("error");
      context?.saved.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSuccess: (data) => {
      client.setQueriesData<UserProfileData>({ queryKey: opKey("UserProfile") }, (current) =>
        current && current.User.id === data.ToggleFollow.id
          ? { User: { ...current.User, isFollowing: data.ToggleFollow.isFollowing } }
          : current,
      );
    },
  });
}

export function useToggleLike() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (activityId: number) => gql("ToggleLike", { id: activityId, type: "ACTIVITY" }, { raw: true }),
    onMutate: (activityId) => {
      haptic.selection();
      const saved = client.getQueriesData<InfiniteData<UserActivityData>>({ queryKey: opKey("UserActivity") });
      client.setQueriesData<InfiniteData<UserActivityData>>({ queryKey: opKey("UserActivity") }, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                Page: {
                  ...page.Page,
                  activities: page.Page.activities.map((item) =>
                    isKnownNode(item) && item.id === activityId
                      ? { ...item, isLiked: !item.isLiked, likeCount: Math.max(0, item.likeCount + (item.isLiked ? -1 : 1)) }
                      : item,
                  ),
                },
              })),
            }
          : data,
      );
      return { saved };
    },
    onError: (_error, _id, context) => {
      haptic.notify("error");
      context?.saved.forEach(([key, data]) => client.setQueryData(key, data));
    },
  });
}

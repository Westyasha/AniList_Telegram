import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useViewerCollection } from "@/api/hooks";
import type { CollectionEntry, MediaListStatus } from "@/api/types";

interface ListIndex {
  get: (mediaId: number) => CollectionEntry | undefined;
  statusOf: (mediaId: number) => MediaListStatus | null;
}

const EMPTY: ListIndex = { get: () => undefined, statusOf: () => null };

const ListIndexContext = createContext<ListIndex>(EMPTY);

export function ListIndexProvider({ children }: { children: ReactNode }) {
  const anime = useViewerCollection("ANIME");
  const manga = useViewerCollection("MANGA", anime.isFetched);

  const value = useMemo<ListIndex>(() => {
    const map = new Map<number, CollectionEntry>();
    for (const entry of [...anime.entries, ...manga.entries]) map.set(entry.mediaId, entry);
    if (map.size === 0) return EMPTY;
    return {
      get: (mediaId) => map.get(mediaId),
      statusOf: (mediaId) => map.get(mediaId)?.status ?? null,
    };
  }, [anime.entries, manga.entries]);

  return <ListIndexContext.Provider value={value}>{children}</ListIndexContext.Provider>;
}

export function useListIndex(): ListIndex {
  return useContext(ListIndexContext);
}

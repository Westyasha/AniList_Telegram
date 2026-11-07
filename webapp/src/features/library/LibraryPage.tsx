import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ArrowUpDown, LayoutGrid, List, Search, X } from "lucide-react";
import { useViewerCollection } from "@/api/hooks";
import { pickTitle, useViewer } from "@/api/session";
import type { CollectionEntry, MediaListStatus, MediaType } from "@/api/types";
import { useT } from "@/lib/i18n";
import { useDebounced } from "@/lib/hooks";
import { readLocal, writeLocal } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoginGate } from "@/components/auth/LoginGate";
import { Segmented } from "@/components/ui/Segmented";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { InfiniteSentinel } from "@/components/ui/InfiniteSentinel";
import { LIST_STATUSES, STATUS_COLOR, statusLabel } from "@/components/media/status";
import { LibraryRow, LibraryTile } from "./LibraryEntry";

type SortKey = "updated" | "score" | "title" | "progress";
type ViewMode = "list" | "grid";

const SORT_KEYS: SortKey[] = ["updated", "score", "title", "progress"];
const PAGE = 40;

function sortEntries(entries: CollectionEntry[], sort: SortKey, loggedIn: boolean): CollectionEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "score":
      return copy.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    case "title":
      return copy.sort((a, b) => pickTitle(a.media.title, loggedIn).localeCompare(pickTitle(b.media.title, loggedIn)));
    case "progress":
      return copy.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    default:
      return copy.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }
}

export function LibraryPage() {
  const t = useT();
  const viewer = useViewer();

  if (!viewer) {
    return (
      <div>
        <PageHeader title={t.library.title} />
        <LoginGate />
      </div>
    );
  }
  return <Library />;
}

function Library() {
  const t = useT();
  const viewer = useViewer();
  const [params, setParams] = useSearchParams();
  const type: MediaType = params.get("type") === "manga" ? "MANGA" : "ANIME";
  const statusParam = params.get("status") as MediaListStatus | null;
  const status = statusParam && LIST_STATUSES.includes(statusParam) ? statusParam : null;
  const [sort, setSort] = useState<SortKey>(() => readLocal<SortKey>("library.sort", "updated"));
  const [view, setView] = useState<ViewMode>(() => readLocal<ViewMode>("library.view", "list"));
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const debounced = useDebounced(filter, 200);
  const { entries, isPending, isError, error, refetch } = useViewerCollection(type);

  useEffect(() => writeLocal("library.sort", sort), [sort]);
  useEffect(() => writeLocal("library.view", view), [view]);
  useEffect(() => setLimit(PAGE), [type, status, debounced, sort]);

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key === "type") next.delete("status");
        return next;
      },
      { replace: true },
    );

  const counts = useMemo(() => {
    const map = new Map<MediaListStatus, number>();
    for (const entry of entries) if (entry.status) map.set(entry.status, (map.get(entry.status) ?? 0) + 1);
    return map;
  }, [entries]);

  const visible = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      if (status && entry.status !== status) return false;
      if (!needle) return true;
      const { romaji, english, native, userPreferred } = entry.media.title;
      return [romaji, english, native, userPreferred].some((value) => value?.toLowerCase().includes(needle));
    });
    return sortEntries(filtered, sort, true);
  }, [entries, status, debounced, sort]);

  const format = viewer?.score_format ?? "POINT_10_DECIMAL";
  const shown = visible.slice(0, limit);

  return (
    <div>
      <PageHeader
        title={t.library.title}
        actions={
          <>
            <label className="relative inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-white/6 hover:text-fg">
              <ArrowUpDown className="size-5" />
              <span className="sr-only">{t.search.sort}</span>
              <select
                value={sort}
                onChange={(event) => {
                  haptic.selection();
                  setSort(event.target.value as SortKey);
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={t.search.sort}
              >
                {SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t.library.sort[key]}
                  </option>
                ))}
              </select>
            </label>
            <IconButton
              label={view === "list" ? t.library.viewGrid : t.library.viewList}
              onClick={() => {
                haptic.selection();
                setView(view === "list" ? "grid" : "list");
              }}
            >
              {view === "list" ? <LayoutGrid className="size-5" /> : <List className="size-5" />}
            </IconButton>
          </>
        }
      />

      <div className="flex flex-col gap-3 px-4 pt-1">
        <Segmented
          value={type}
          onChange={(value) => setParam("type", value === "MANGA" ? "manga" : null)}
          options={[
            { value: "ANIME", label: t.search.types.anime },
            { value: "MANGA", label: t.search.types.manga },
          ]}
        />
        <label className="relative flex h-11 items-center rounded-xl border border-line bg-surface-2 focus-within:border-line-strong">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-faint" aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t.library.searchPlaceholder}
            aria-label={t.library.searchPlaceholder}
            className="h-full w-full bg-transparent pr-10 pl-10 text-sm outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {filter && (
            <button type="button" aria-label={t.common.clear} onClick={() => setFilter("")} className="absolute right-1 flex size-9 items-center justify-center text-faint">
              <X className="size-4" />
            </button>
          )}
        </label>
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip selected={!status} count={entries.length} onClick={() => setParam("status", null)}>
          {t.library.all}
        </Chip>
        {LIST_STATUSES.filter((value) => counts.get(value)).map((value) => (
          <Chip
            key={value}
            selected={status === value}
            dot={STATUS_COLOR[value]}
            count={counts.get(value)}
            onClick={() => {
              haptic.selection();
              setParam("status", status === value ? null : value);
            }}
          >
            {statusLabel(t, type, value)}
          </Chip>
        ))}
      </div>

      <div className="mt-3">
        {isPending ? (
          <ListSkeleton count={7} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState title={t.library.empty} body={t.library.emptyBody} />
        ) : visible.length === 0 ? (
          <EmptyState title={t.library.emptyFilter} />
        ) : view === "list" ? (
          <div className="flex flex-col gap-2 px-4">
            {shown.map((entry) => (
              <LibraryRow key={entry.id} entry={entry} format={format} showStatus={!status} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-4 px-4 sm:grid-cols-4">
            {shown.map((entry) => (
              <LibraryTile key={entry.id} entry={entry} format={format} showStatus={!status} />
            ))}
          </div>
        )}
        <InfiniteSentinel hasMore={shown.length < visible.length} loading={false} onMore={() => setLimit((value) => value + PAGE)} />
      </div>
    </div>
  );
}

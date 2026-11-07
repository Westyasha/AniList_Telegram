"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, Search, X } from "lucide-react";
import { useViewerCollection } from "@/api/hooks";
import { pickTitle, useViewer } from "@/api/session";
import type { CollectionEntry, MediaListStatus, MediaType } from "@/api/types";
import { useT } from "@/lib/i18n";
import { useDebounced } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";
import { LIST_STATUSES, statusLabel } from "@/lib/status";
import { readLocal, writeLocal } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useQueryParams } from "@/lib/useQueryParams";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/shell/PageHeader";
import { LoginGate } from "@/components/shell/LoginGate";
import { Tabs } from "@/components/ui/Tabs";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { Sentinel } from "@/components/ui/Sentinel";
import { EntryRow } from "@/components/media/EntryRow";
import { StatusDot } from "@/components/media/Marks";

type SortKey = "updated" | "score" | "title" | "progress";

const SORT_KEYS: SortKey[] = ["updated", "score", "title", "progress"];
const PAGE = 40;

function sortEntries(entries: CollectionEntry[], sort: SortKey): CollectionEntry[] {
  switch (sort) {
    case "score":
      return entries.toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    case "title":
      return entries.toSorted((a, b) => pickTitle(a.media.title, true).localeCompare(pickTitle(b.media.title, true)));
    case "progress":
      return entries.toSorted((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    default:
      return entries.toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }
}

export function LibraryScreen() {
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

function SortControl({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  const t = useT();
  return (
    <Select<SortKey>
      variant="inline"
      align="end"
      label={t.search.sort}
      value={value}
      onChange={onChange}
      icon={<Icon icon={ArrowUpDown} />}
      options={SORT_KEYS.map((key) => ({ value: key, label: t.library.sort[key] }))}
    />
  );
}

function Library() {
  const t = useT();
  const viewer = useViewer();
  const { params, update } = useQueryParams();
  const type: MediaType = params.get("type") === "manga" ? "MANGA" : "ANIME";
  const statusParam = params.get("status") as MediaListStatus | null;
  const status = statusParam && LIST_STATUSES.includes(statusParam) ? statusParam : null;
  const [sort, setSort] = useState<SortKey>(() => readLocal<SortKey>("library.sort", "updated"));
  const [filter, setFilter] = useState("");
  const [pages, setPages] = useState({ key: "", count: 1 });
  const debounced = useDebounced(filter, 200);
  const { entries, isPending, isError, error, refetch } = useViewerCollection(type);

  const resetKey = `${type}|${status}|${debounced}|${sort}`;
  const limit = (pages.key === resetKey ? pages.count : 1) * PAGE;

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
    return sortEntries(filtered, sort);
  }, [entries, status, debounced, sort]);

  const format = viewer?.score_format ?? "POINT_10_DECIMAL";
  const shown = visible.slice(0, limit);

  const changeSort = (value: SortKey) => {
    setSort(value);
    writeLocal("library.sort", value);
  };

  const filters: { value: MediaListStatus | null; label: string; count: number }[] = [
    { value: null, label: t.library.all, count: entries.length },
    ...LIST_STATUSES.filter((value) => counts.get(value)).map((value) => ({ value, label: statusLabel(t, type, value), count: counts.get(value) ?? 0 })),
  ];

  return (
    <div>
      <PageHeader title={t.library.title} actions={<SortControl value={sort} onChange={changeSort} />} />
      <Tabs<MediaType>
        label={t.library.title}
        value={type}
        onChange={(value) => update({ type: value === "MANGA" ? "manga" : null, status: null })}
        items={[
          { value: "ANIME", label: t.search.types.anime },
          { value: "MANGA", label: t.search.types.manga },
        ]}
      />

      <div className="flex flex-col gap-3 pt-4">
        <label className="relative mx-4 flex h-11 items-center rounded-control border border-line bg-s2 transition-colors focus-within:border-line-strong">
          <Icon icon={Search} className="pointer-events-none absolute left-3 text-fg3" />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t.library.searchPlaceholder}
            aria-label={t.library.searchPlaceholder}
            className="h-full w-full min-w-0 bg-transparent pr-11 pl-10 text-15 text-fg outline-none placeholder:text-fg3"
          />
          {filter ? (
            <button type="button" aria-label={t.common.clear} onClick={() => setFilter("")} className="absolute right-0 flex size-11 items-center justify-center text-fg3 hover:text-fg">
              <Icon icon={X} />
            </button>
          ) : null}
        </label>

        <div role="radiogroup" aria-label={t.search.status} className="no-scrollbar flex gap-1 overflow-x-auto px-4">
          {filters.map((item) => {
            const active = item.value === status;
            return (
              <button
                key={item.value ?? "all"}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  haptic.selection();
                  update({ status: item.value });
                }}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-control px-3 text-13 transition-colors duration-120",
                  active ? "bg-s2 text-fg" : "text-fg2 hover:text-fg",
                )}
              >
                {item.value ? <StatusDot status={item.value} /> : null}
                {item.label}
                <span className="figure text-fg3">{formatNumber(item.count, t.locale)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2">
        {isPending ? (
          <RowsSkeleton count={7} height={92} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState
            title={t.library.empty}
            action={
              <Link href="/search" className="inline-flex h-11 items-center rounded-control border border-line bg-s2 px-4 text-15 font-medium text-fg">
                {t.library.emptyAction}
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState title={t.library.emptyFilter} />
        ) : (
          <div className="px-4">
            {shown.map((entry) => (
              <EntryRow key={entry.id} entry={entry} format={format} showStatus={!status} />
            ))}
          </div>
        )}
        <Sentinel
          hasMore={shown.length < visible.length}
          loading={false}
          onMore={() => setPages((prev) => ({ key: resetKey, count: (prev.key === resetKey ? prev.count : 1) + 1 }))}
        />
      </div>
    </div>
  );
}

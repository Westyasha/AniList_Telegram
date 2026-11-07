"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useGenres } from "@/api/hooks";
import type { MediaSort } from "@/api/types";
import { useT } from "@/lib/i18n";
import { SEASONS } from "@/lib/season";
import { haptic } from "@/lib/telegram";
import { Sheet } from "@/components/ui/Sheet";
import { ToggleChip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ANIME_FORMATS, EMPTY_FILTERS, MANGA_FORMATS, MEDIA_STATUSES, SORTS, type MediaFilters } from "./searchState";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  kind: "anime" | "manga";
  value: MediaFilters;
  onApply: (filters: MediaFilters) => void;
  hasQuery: boolean;
}

function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <legend className="text-13 text-fg3">{title}</legend>
        {aside}
      </div>
      {children}
    </fieldset>
  );
}

function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export function FilterSheet(props: FilterSheetProps) {
  const t = useT();
  return (
    <Sheet open={props.open} onClose={props.onClose} label={t.search.filters} title={t.search.filters}>
      <FilterForm key={props.open ? "open" : "closed"} {...props} />
    </Sheet>
  );
}

function FilterForm({ onClose, kind, value, onApply, hasQuery }: FilterSheetProps) {
  const t = useT();
  const [draft, setDraft] = useState(value);
  const genres = useGenres();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear + 2 - 1940 }, (_, index) => currentYear + 1 - index);
  const formats = kind === "anime" ? ANIME_FORMATS : MANGA_FORMATS;
  const sorts: MediaSort[] = hasQuery ? ["SEARCH_MATCH", ...SORTS] : SORTS;
  const currentSort = draft.sort ?? (hasQuery ? "SEARCH_MATCH" : "POPULARITY_DESC");

  const patch = (next: Partial<MediaFilters>) => {
    haptic.selection();
    setDraft((prev) => ({ ...prev, ...next }));
  };

  return (
    <div className="flex flex-col">
      <Group title={t.search.sort}>
        <div className="flex flex-wrap gap-2">
          {sorts.map((sort) => (
            <ToggleChip key={sort} selected={currentSort === sort} onClick={() => patch({ sort })}>
              {t.search.sortOptions[sort]}
            </ToggleChip>
          ))}
        </div>
      </Group>

      <Group title={t.search.genres} aside={draft.genres.length > 0 ? <span className="figure text-13 text-fg2">{draft.genres.length}</span> : null}>
        <div className="flex flex-wrap gap-2">
          {genres.isPending
            ? Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="h-8 w-20 rounded-chip" />)
            : (genres.data?.genres ?? [])
                .filter((genre) => genre !== "Hentai")
                .map((genre) => (
                  <ToggleChip key={genre} selected={draft.genres.includes(genre)} onClick={() => patch({ genres: toggle(draft.genres, genre) })}>
                    {genre}
                  </ToggleChip>
                ))}
        </div>
      </Group>

      <Group title={t.search.year}>
        <div className="relative">
          <select
            value={draft.year ?? ""}
            onChange={(event) => patch({ year: event.target.value ? Number(event.target.value) : null })}
            className="figure h-11 w-full appearance-none rounded-control border border-line bg-s2 px-3 text-15 text-fg outline-none"
            aria-label={t.search.year}
          >
            <option value="">{t.common.any}</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <Icon icon={ChevronDown} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg3" />
        </div>
      </Group>

      {kind === "anime" ? (
        <Group title={t.search.season}>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((season) => (
              <ToggleChip key={season} selected={draft.season === season} onClick={() => patch({ season: draft.season === season ? null : season })}>
                {t.enums.season[season]}
              </ToggleChip>
            ))}
          </div>
        </Group>
      ) : null}

      <Group title={t.search.format}>
        <div className="flex flex-wrap gap-2">
          {formats.map((format) => (
            <ToggleChip key={format} selected={draft.formats.includes(format)} onClick={() => patch({ formats: toggle(draft.formats, format) })}>
              {t.enums.format[format]}
            </ToggleChip>
          ))}
        </div>
      </Group>

      <Group title={t.search.status}>
        <div className="flex flex-wrap gap-2">
          {MEDIA_STATUSES.map((status) => (
            <ToggleChip key={status} selected={draft.status === status} onClick={() => patch({ status: draft.status === status ? null : status })}>
              {t.enums.status[status]}
            </ToggleChip>
          ))}
        </div>
      </Group>

      <Group title={t.search.minScore} aside={<span className="figure text-13 text-fg">{draft.minScore > 0 ? `${draft.minScore}%` : t.common.any}</span>}>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={draft.minScore}
          aria-label={t.search.minScore}
          className="range w-full"
          style={{ "--fill": `${(draft.minScore / 90) * 100}%` } as CSSProperties}
          onChange={(event) => {
            haptic.selection();
            setDraft((prev) => ({ ...prev, minScore: Number(event.target.value) }));
          }}
        />
      </Group>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-s1 px-4 pt-3">
        <Button variant="secondary" onClick={() => setDraft({ ...EMPTY_FILTERS, sort: draft.sort })}>
          {t.common.reset}
        </Button>
        <Button
          variant="primary"
          block
          className="flex-1"
          onClick={() => {
            onApply(draft);
            onClose();
          }}
        >
          {t.common.apply}
        </Button>
      </div>
    </div>
  );
}

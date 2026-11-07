import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useGenres } from "@/api/hooks";
import type { MediaSort } from "@/api/types";
import { useT } from "@/lib/i18n";
import { SEASONS } from "@/lib/season";
import { haptic } from "@/lib/telegram";
import { Sheet } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
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

function Group({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5 border-b border-line py-4 last:border-0">
      <div className="flex items-center justify-between">
        <legend className="text-xs font-bold text-muted">{title}</legend>
        {aside}
      </div>
      {children}
    </fieldset>
  );
}

function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export function FilterSheet({ open, onClose, kind, value, onApply, hasQuery }: FilterSheetProps) {
  const t = useT();
  const [draft, setDraft] = useState(value);
  const genres = useGenres();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear + 2 - 1940 }, (_, index) => currentYear + 1 - index);
  const formats = kind === "anime" ? ANIME_FORMATS : MANGA_FORMATS;
  const sorts: MediaSort[] = hasQuery ? ["SEARCH_MATCH", ...SORTS] : SORTS;

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const patch = (next: Partial<MediaFilters>) => {
    haptic.selection();
    setDraft((prev) => ({ ...prev, ...next }));
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.search.filters}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" onClick={() => setDraft({ ...EMPTY_FILTERS, sort: draft.sort })}>
            {t.common.reset}
          </Button>
          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {t.common.apply}
          </Button>
        </div>
      }
    >
      <Group title={t.search.sort}>
        <div className="flex flex-wrap gap-2">
          {sorts.map((sort) => (
            <Chip
              key={sort}
              selected={(draft.sort ?? (hasQuery ? "SEARCH_MATCH" : "POPULARITY_DESC")) === sort}
              onClick={() => patch({ sort })}
            >
              {t.search.sortOptions[sort]}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title={t.search.genres} aside={draft.genres.length > 0 && <span className="tabular text-xs font-bold text-primary-hover">{draft.genres.length}</span>}>
        {genres.isPending ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(genres.data?.genres ?? []).filter((genre) => genre !== "Hentai").map((genre) => (
              <Chip key={genre} selected={draft.genres.includes(genre)} onClick={() => patch({ genres: toggle(draft.genres, genre) })}>
                {genre}
              </Chip>
            ))}
          </div>
        )}
      </Group>

      <div className="grid grid-cols-1 gap-x-3">
        <Group title={t.search.year}>
          <div className="relative">
            <select
              value={draft.year ?? ""}
              onChange={(event) => patch({ year: event.target.value ? Number(event.target.value) : null })}
              className="h-11 w-full appearance-none rounded-xl border border-line bg-surface-2 px-3.5 text-sm font-semibold outline-none"
              aria-label={t.search.year}
            >
              <option value="">{t.common.any}</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint" />
          </div>
        </Group>
      </div>

      {kind === "anime" && (
        <Group title={t.search.season}>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((season) => (
              <Chip key={season} selected={draft.season === season} onClick={() => patch({ season: draft.season === season ? null : season })}>
                {t.enums.season[season]}
              </Chip>
            ))}
          </div>
        </Group>
      )}

      <Group title={t.search.format}>
        <div className="flex flex-wrap gap-2">
          {formats.map((format) => (
            <Chip key={format} selected={draft.formats.includes(format)} onClick={() => patch({ formats: toggle(draft.formats, format) })}>
              {t.enums.format[format]}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title={t.search.status}>
        <div className="flex flex-wrap gap-2">
          {MEDIA_STATUSES.map((status) => (
            <Chip key={status} selected={draft.status === status} onClick={() => patch({ status: draft.status === status ? null : status })}>
              {t.enums.status[status]}
            </Chip>
          ))}
        </div>
      </Group>

      <Group title={t.search.minScore} aside={<span className="tabular text-sm font-bold">{draft.minScore > 0 ? `${draft.minScore}%+` : t.common.any}</span>}>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={draft.minScore}
          aria-label={t.search.minScore}
          className="range"
          style={{ "--fill": `${(draft.minScore / 90) * 100}%` } as CSSProperties}
          onChange={(event) => {
            haptic.selection();
            setDraft((prev) => ({ ...prev, minScore: Number(event.target.value) }));
          }}
        />
      </Group>
    </Sheet>
  );
}

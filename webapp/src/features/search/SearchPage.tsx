import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useDebounced } from "@/lib/hooks";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Chip } from "@/components/ui/Chip";
import { FilterSheet } from "./FilterSheet";
import { CharacterResults, MediaResults, StaffResults, UserResults } from "./Results";
import { countFilters, EMPTY_FILTERS, SEARCH_KINDS, toVariables, useSearchState } from "./searchState";

export function SearchPage() {
  const t = useT();
  const { kind, query, filters, setKind, setQuery, setFilters } = useSearchState();
  const [input, setInput] = useState(query);
  const [sheetOpen, setSheetOpen] = useState(false);
  const debounced = useDebounced(input, 380);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMedia = kind === "anime" || kind === "manga";
  const active = countFilters(filters);

  useEffect(() => {
    if (debounced !== query) setQuery(debounced);
  }, [debounced, query, setQuery]);

  const variables = useMemo(() => (isMedia ? toVariables(kind, query, filters) : null), [isMedia, kind, query, filters]);

  return (
    <div>
      <header className="sticky top-0 z-30 bg-bg/88 backdrop-blur-xl" style={{ paddingTop: "var(--safe-top)" }}>
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <label className="relative flex h-11 flex-1 items-center rounded-xl border border-line bg-surface-2 focus-within:border-line-strong">
            <Search className="pointer-events-none absolute left-3.5 size-[18px] text-faint" aria-hidden />
            <span className="sr-only">{t.tabs.search}</span>
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              value={input}
              placeholder={t.search.placeholder}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setQuery(input);
                  inputRef.current?.blur();
                }
              }}
              className="h-full w-full bg-transparent pr-10 pl-10 text-[15px] outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
            />
            {input && (
              <button
                type="button"
                aria-label={t.common.clear}
                onClick={() => {
                  setInput("");
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-1 flex size-9 items-center justify-center rounded-lg text-faint hover:text-fg"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
          {isMedia && (
            <button
              type="button"
              aria-label={t.search.filters}
              onClick={() => {
                haptic.impact("light");
                setSheetOpen(true);
              }}
              className={cn(
                "relative flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                active ? "border-primary/40 bg-primary/12 text-primary-hover" : "border-line bg-surface-2 text-muted hover:text-fg",
              )}
            >
              <SlidersHorizontal className="size-[18px]" />
              {active > 0 && (
                <span className="tabular absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-bg">
                  {active}
                </span>
              )}
            </button>
          )}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {SEARCH_KINDS.map((value) => (
            <Chip
              key={value}
              selected={kind === value}
              onClick={() => {
                if (kind === value) return;
                haptic.selection();
                setKind(value);
              }}
            >
              {t.search.types[value]}
            </Chip>
          ))}
        </div>
      </header>

      <div className="pt-2">
        {variables && (
          <MediaResults variables={variables} onClearFilters={active > 0 ? () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort }) : undefined} />
        )}
        {kind === "characters" && <CharacterResults search={query} />}
        {kind === "staff" && <StaffResults search={query} />}
        {kind === "users" && <UserResults search={query} />}
      </div>

      {isMedia && (
        <FilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          kind={kind}
          value={filters}
          onApply={setFilters}
          hasQuery={Boolean(query.trim())}
        />
      )}
    </div>
  );
}

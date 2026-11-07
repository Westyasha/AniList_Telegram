"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useDebounced } from "@/lib/hooks";
import { haptic } from "@/lib/telegram";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { FilterSheet } from "./FilterSheet";
import { CharacterResults, MediaResults, StaffResults, UserResults } from "./Results";
import { countFilters, EMPTY_FILTERS, SEARCH_KINDS, toVariables, useSearchState, type SearchKind } from "./searchState";

export function SearchScreen() {
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
      <header className="sticky top-0 z-30 bg-bg pt-safe">
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-control border border-line bg-s2 transition-colors focus-within:border-line-strong">
            <Icon icon={Search} className="pointer-events-none absolute left-3 text-fg3" />
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
              className="h-full w-full min-w-0 bg-transparent pr-11 pl-10 text-15 text-fg outline-none placeholder:text-fg3"
            />
            {input ? (
              <button
                type="button"
                aria-label={t.common.clear}
                onClick={() => {
                  setInput("");
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-0 flex size-11 items-center justify-center text-fg3 transition-colors hover:text-fg"
              >
                <Icon icon={X} />
              </button>
            ) : null}
          </label>
          {isMedia ? (
            <button
              type="button"
              aria-label={active > 0 ? `${t.search.filters}: ${active}` : t.search.filters}
              onClick={() => {
                haptic.impact("light");
                setSheetOpen(true);
              }}
              className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-control border border-line bg-s2 px-3 text-fg2 transition-colors hover:text-fg"
            >
              <Icon icon={SlidersHorizontal} />
              {active > 0 ? <span className="figure text-13 text-fg">{active}</span> : null}
            </button>
          ) : null}
        </div>
        <Tabs<SearchKind>
          label={t.tabs.search}
          value={kind}
          onChange={setKind}
          items={SEARCH_KINDS.map((value) => ({ value, label: t.search.types[value] }))}
        />
      </header>

      <div className="pt-4">
        {variables ? (
          <MediaResults variables={variables} onClearFilters={active > 0 ? () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort }) : undefined} />
        ) : null}
        {kind === "characters" ? <CharacterResults search={query} /> : null}
        {kind === "staff" ? <StaffResults search={query} /> : null}
        {kind === "users" ? <UserResults search={query} /> : null}
      </div>

      {isMedia ? (
        <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} kind={kind} value={filters} onApply={setFilters} hasQuery={Boolean(query.trim())} />
      ) : null}
    </div>
  );
}

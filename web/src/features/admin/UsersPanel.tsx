"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Search, X } from "lucide-react";
import { useAdminUserDays, useAdminUsers, type AdminUser, type UserSort } from "@/api/admin";
import { useI18n } from "@/lib/i18n";
import { useDebounced } from "@/lib/hooks";
import { formatFuzzyDate, formatNumber, formatRelative, formatShortDay } from "@/lib/format";
import { openExternal } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { DailyBars } from "@/components/charts/DailyBars";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { RowsSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";

export function UsersPanel() {
  const { t } = useI18n();
  const a = t.admin;
  const [input, setInput] = useState("");
  const [sort, setSort] = useState<UserSort>("seen");
  const [open, setOpen] = useState<number | null>(null);
  const query = useDebounced(input.trim(), 300);
  const { data, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminUsers(query, sort);
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="flex flex-col gap-3 pb-8">
      <div className="flex items-center gap-2 px-4">
        <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-control border border-line bg-s2 transition-colors focus-within:border-line-strong">
          <Icon icon={Search} className="pointer-events-none absolute left-3 text-fg3" />
          <span className="sr-only">{a.search}</span>
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            value={input}
            placeholder={a.search}
            onChange={(event) => setInput(event.target.value)}
            className="h-full w-full min-w-0 bg-transparent pr-11 pl-10 text-15 text-fg outline-none placeholder:text-fg3"
          />
          {input ? (
            <button
              type="button"
              aria-label={t.common.clear}
              onClick={() => setInput("")}
              className="absolute right-0 flex size-11 items-center justify-center text-fg3 transition-colors hover:text-fg"
            >
              <Icon icon={X} />
            </button>
          ) : null}
        </label>
        <Select
          variant="inline"
          align="end"
          label={a.sort}
          value={sort}
          onChange={setSort}
          options={(["seen", "joined", "active"] as const).map((value) => ({ value, label: a.sorts[value] }))}
        />
      </div>
      <p className="figure px-4 text-13 text-fg3">{data ? a.usersFound(total) : " "}</p>

      {isPending ? (
        <RowsSkeleton count={8} height={64} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t.search.noResults} />
      ) : (
        <ul className="border-t border-line">
          {items.map((user) => (
            <UserRow key={user.id} user={user} open={open === user.id} onToggle={() => setOpen(open === user.id ? null : user.id)} />
          ))}
        </ul>
      )}

      {hasNextPage ? (
        <div className="px-4 pt-2">
          <Button block busy={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {t.common.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function UserRow({ user, open, onToggle }: { user: AdminUser; open: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const a = t.admin;
  const name = user.anilist_name ?? `id ${user.id}`;
  const seen = user.last_seen ? formatRelative(user.last_seen, t.locale) : a.neverSeen;

  return (
    <li className="border-b border-line">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-s1">
        <span
          aria-hidden
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-13 font-medium",
            user.linked ? "bg-s3 text-fg" : "bg-s2 text-fg3",
          )}
        >
          {name.replace(/^id /, "").slice(0, 2).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("truncate text-15", user.linked ? "text-fg" : "text-fg2")}>{name}</span>
            {user.blocked ? <span className="shrink-0 rounded-chip bg-s2 px-1.5 text-12 text-score-low">{a.blockedBadge}</span> : null}
          </span>
          <span className="figure truncate text-12 text-fg3">
            {user.id} · {user.lang.toUpperCase()}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5 text-12 text-fg2">
            {user.online ? <span aria-hidden className="size-1.5 rounded-full bg-score-high" /> : null}
            {user.online ? a.live : seen}
          </span>
          <span className="inline-flex items-center gap-1 text-12 text-fg3">
            {a.eventsWeek(user.events_7d)}
            <Icon icon={ChevronDown} className={cn("transition-transform duration-120", open && "rotate-180")} />
          </span>
        </span>
      </button>
      {open ? <UserDetails user={user} /> : null}
    </li>
  );
}

function UserDetails({ user }: { user: AdminUser }) {
  const { t } = useI18n();
  const a = t.admin;
  const { data } = useAdminUserDays(user.id);
  const joined = user.joined ? new Date(user.joined * 1000) : null;
  const formatDay = (key: string) => formatShortDay(key, t.locale);

  return (
    <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
      <p className="text-13 text-fg3">
        {joined
          ? a.joinedOn(
              formatFuzzyDate({ year: joined.getFullYear(), month: joined.getMonth() + 1, day: joined.getDate() }, t.locale) ?? "",
            )
          : null}
        {user.last_seen ? ` · ${formatRelative(user.last_seen, t.locale)}` : null}
        {user.linked ? null : ` · ${a.guest}`}
      </p>
      {data ? (
        <DailyBars
          label={a.userActivity}
          height={72}
          bars={data.map((day) => ({ key: day.day, value: day.bot, stack: day.app }))}
          formatDay={formatDay}
          readout={(index) => (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-fg/40" />
                <span className="text-fg3">{a.bot}</span>
                <span className="figure text-fg">{formatNumber(data[index].bot, t.locale)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-fg2/60" />
                <span className="text-fg3">{a.app}</span>
                <span className="figure text-fg">{formatNumber(data[index].app, t.locale)}</span>
              </span>
            </>
          )}
        />
      ) : (
        <Skeleton className="h-[120px] rounded-card" />
      )}
      {user.anilist_name ? (
        <div>
          <Button icon={ExternalLink} onClick={() => openExternal(`https://anilist.co/user/${encodeURIComponent(user.anilist_name ?? "")}`)}>
            AniList
          </Button>
        </div>
      ) : null}
    </div>
  );
}

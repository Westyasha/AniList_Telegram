import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { request } from "./client";

export type Window = "5m" | "1h" | "24h";
export type SeriesRange = "1h" | "6h" | "24h";
export type UserSort = "seen" | "joined" | "active";

export interface Summary {
  count: number;
  errors: number;
  rate: number;
  avg: number;
  p50: number;
  p95: number;
  max: number;
}

export interface AdminOverview {
  now: number;
  online: number;
  users: {
    total: number;
    linked: number;
    blocked: number;
    new_today: number;
    new_7d: number;
    seen_1h: number;
    seen_24h: number;
    notifiable: number;
    dau: number;
    wau: number;
    mau: number;
    events_today: { bot: number; app: number };
    langs: Record<string, number>;
  };
  load: {
    updates: Record<Window, Summary>;
    update_kinds: Record<string, number>;
    api: Record<Window, Summary>;
    anilist: Record<Window, Summary>;
    anilist_limited_24h: number;
    cache_hit: Record<Window, number | null>;
    renders: Summary;
    notifications: { "1h": number; "24h": number };
    notifier: { last_run: number | null; duration: number };
    errors: { "1h": number; "24h": number };
    warnings: { "1h": number; "24h": number };
  };
  anilist: { window_used: number; window_limit: number; blocked_for: number; cache_entries: number; inflight: number };
  process: {
    pid: number;
    uptime: number;
    cpu: number;
    rss_mb: number;
    threads: number;
    fds: number | null;
    loop_lag_ms: number;
    loop_lag_peak_ms: number;
    tasks: number;
  };
  system: {
    cpu: number;
    cores: number;
    load: number[] | null;
    memory_used_mb: number;
    memory_total_mb: number;
    disk_used_gb: number;
    disk_total_gb: number;
    boot_time: number;
  };
  database: {
    version: string;
    size_mb: number;
    connections: number;
    active_connections: number;
    pool: { size: number | null; checked_out: number | null };
    tables: { name: string; rows: number; size_kb: number }[];
  };
}

export type SeriesPoint = Summary & { t: number };

export interface GaugePoint {
  t: number;
  avg: number | null;
  max: number | null;
}

export interface AdminSeries {
  range: SeriesRange;
  step: number;
  updates: SeriesPoint[];
  api: SeriesPoint[];
  anilist: SeriesPoint[];
  renders: SeriesPoint[];
  errors: SeriesPoint[];
  cpu: GaugePoint[];
  rss: GaugePoint[];
  loop_lag: GaugePoint[];
  system_cpu: GaugePoint[];
  system_memory: GaugePoint[];
}

export interface DailyPoint {
  day: string;
  active: number;
  bot: number;
  app: number;
  joined: number;
}

export interface AdminUser {
  id: number;
  lang: string;
  anilist_id: number | null;
  anilist_name: string | null;
  linked: boolean;
  blocked: boolean;
  online: boolean;
  last_seen: number | null;
  joined: number | null;
  events_7d: number;
}

export interface AdminUsersPage {
  total: number;
  items: AdminUser[];
  offset: number;
  limit: number;
}

export interface UserDay {
  day: string;
  bot: number;
  app: number;
}

export interface AdminError {
  at: number;
  source: string;
  kind: string;
  message: string;
}

const LIVE = 10_000;

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: ({ signal }) => request<AdminOverview>("admin/overview", { signal }),
    refetchInterval: LIVE,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

export function useAdminSeries(range: SeriesRange) {
  return useQuery({
    queryKey: ["admin", "series", range],
    queryFn: ({ signal }) => request<AdminSeries>(`admin/series?range=${range}`, { signal }),
    refetchInterval: range === "1h" ? LIVE * 3 : LIVE * 6,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useAdminDaily(days = 30) {
  return useQuery({
    queryKey: ["admin", "daily", days],
    queryFn: ({ signal }) => request<{ days: DailyPoint[] }>(`admin/daily?days=${days}`, { signal }),
    select: (data) => data.days,
    refetchInterval: LIVE * 6,
    retry: false,
  });
}

export function useAdminUsers(query: string, sort: UserSort) {
  return useInfiniteQuery({
    queryKey: ["admin", "users", query, sort],
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ q: query, sort, offset: String(pageParam) });
      return request<AdminUsersPage>(`admin/users?${params}`, { signal });
    },
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.limit : undefined),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useAdminUserDays(userId: number | null) {
  return useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: ({ signal }) => request<{ days: UserDay[] }>(`admin/users/${userId}`, { signal }),
    select: (data) => data.days,
    enabled: userId !== null,
    retry: false,
  });
}

export function useAdminErrors() {
  return useQuery({
    queryKey: ["admin", "errors"],
    queryFn: ({ signal }) => request<{ errors: AdminError[] }>("admin/errors", { signal }),
    select: (data) => data.errors,
    refetchInterval: LIVE * 3,
    retry: false,
  });
}

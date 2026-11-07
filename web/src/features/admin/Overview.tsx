"use client";

import { useMemo, useState } from "react";
import { useAdminDaily, useAdminSeries, type AdminOverview, type SeriesRange, type Summary } from "@/api/admin";
import { useI18n } from "@/lib/i18n";
import { formatNumber, formatRelative, formatShortDay, formatTime } from "@/lib/format";
import { LineChart } from "@/components/charts/LineChart";
import { DailyBars } from "@/components/charts/DailyBars";
import { RankedList } from "@/components/charts/RankedList";
import { DefinitionList } from "@/components/ui/DefinitionList";
import { Skeleton } from "@/components/ui/Skeleton";
import { LiveDot, Meter, Panel, Segmented, SplitBar, Stat } from "./parts";

type Metric = "updates" | "api" | "anilist" | "renders";

const LANG_COLORS: Record<string, string> = { ru: "var(--color-accent)", en: "var(--color-fg2)" };

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}

export function Overview({ data }: { data: AdminOverview }) {
  const { t } = useI18n();
  const a = t.admin;
  const locale = t.locale;
  const n = (value: number) => formatNumber(value, locale);
  const { users, load, process, system, database, anilist } = data;
  const hour = load.updates["1h"];
  const linkedShare = users.total ? Math.round((users.linked / users.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section className="flex flex-col gap-4 px-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-13 text-fg2">
              <LiveDot />
              {a.online}
            </span>
            <span className="figure text-[56px] leading-[56px] font-medium tracking-tight text-fg">{n(data.online)}</span>
          </div>
          <dl className="grid grid-cols-3 gap-4 pb-1 text-right">
            {(
              [
                [a.dau, users.dau],
                [a.wau, users.wau],
                [a.mau, users.mau],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-12 text-fg3">{label}</dt>
                <dd className="figure text-20 text-fg">{n(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-13 text-fg3">{a.onlineHint}</p>
        <div className="grid grid-cols-2 gap-3">
          <Stat label={a.users} value={n(users.total)} detail={a.newToday(users.new_today)} />
          <Stat label={a.linked} value={n(users.linked)} detail={a.linkedShare(linkedShare)} />
          <Stat label={a.updates} value={a.perMinute(hour.rate.toFixed(1))} detail={a.p95(a.ms(hour.p95))} />
          <Stat
            label={a.anilistWindow}
            value={`${anilist.window_used}/${anilist.window_limit}`}
            detail={a.cacheHit(pct(load.cache_hit["1h"]))}
            tone={anilist.blocked_for > 0 ? "warn" : undefined}
          />
        </div>
      </section>

      <LoadPanel />

      <Panel title={a.latencyTable} hint={a.latencyHint}>
        <LatencyTable
          rows={[
            [t.admin.metrics.updates, load.updates["1h"]],
            [t.admin.metrics.api, load.api["1h"]],
            [t.admin.metrics.anilist, load.anilist["1h"]],
            [t.admin.metrics.renders, load.renders],
          ]}
        />
      </Panel>

      <ActivityPanel eventsToday={users.events_today} />

      <Panel title={a.server} hint={`${a.uptime} ${a.duration(process.uptime)} · PID ${process.pid}`}>
        <ServerChart />
        <DefinitionList
          rows={[
            [a.rss, a.mb(process.rss_mb)],
            [a.loopLag, a.loopLagValue(a.ms(process.loop_lag_ms), a.ms(process.loop_lag_peak_ms))],
            [a.tasks, n(process.tasks)],
            [a.threads, n(process.threads)],
            [a.hostMemory, `${a.mb(system.memory_used_mb)} / ${a.mb(system.memory_total_mb)}`],
            [a.loadAvg, system.load ? `${system.load.map((value) => value.toFixed(2)).join(" · ")} · ${a.cores(system.cores)}` : a.cores(system.cores)],
            [a.disk, `${a.mb(system.disk_used_gb * 1024)} / ${a.mb(system.disk_total_gb * 1024)}`],
          ]}
        />
      </Panel>

      <Panel title={a.anilist}>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-13">
            <span className="text-fg2">{a.window}</span>
            <span className="text-fg">{a.windowValue(anilist.window_used, anilist.window_limit)}</span>
          </div>
          <Meter value={anilist.window_used} max={anilist.window_limit} />
        </div>
        <DefinitionList
          rows={[
            [a.hitRate, a.hitRateValue(pct(load.cache_hit["5m"]), pct(load.cache_hit["1h"]), pct(load.cache_hit["24h"]))],
            [a.limited, n(load.anilist_limited_24h)],
            [a.blocked, anilist.blocked_for > 0 ? a.ms(anilist.blocked_for * 1000) : "—"],
            [a.cacheEntries, n(anilist.cache_entries)],
            [a.inflight, n(anilist.inflight)],
          ]}
        />
      </Panel>

      <Panel title={a.notifier}>
        <DefinitionList
          rows={[
            [a.lastRun, load.notifier.last_run ? a.lastRunValue(formatRelative(load.notifier.last_run, locale), a.ms(load.notifier.duration * 1000)) : a.never],
            [a.sent, a.sentValue(load.notifications["1h"], load.notifications["24h"])],
            [a.notifiable, n(users.notifiable)],
          ]}
        />
      </Panel>

      {Object.keys(load.update_kinds).length ? (
        <Panel title={a.updateKinds}>
          <RankedList
            items={Object.entries(load.update_kinds).map(([kind, count]) => ({
              key: kind,
              label: a.kinds[kind] ?? kind,
              value: count,
              display: n(count),
            }))}
          />
        </Panel>
      ) : null}

      <Panel title={a.languages} hint={users.blocked ? a.blockedUsers(users.blocked) : undefined}>
        <SplitBar
          parts={Object.entries(users.langs).map(([code, count]) => ({
            key: code,
            label: code.toUpperCase(),
            value: count,
            color: LANG_COLORS[code] ?? "var(--color-fg3)",
          }))}
        />
      </Panel>

      <Panel title={a.database} hint={`${database.version} · ${a.mb(database.size_mb)}`}>
        <DefinitionList
          rows={[
            [a.connections, a.connectionsValue(database.connections, database.active_connections)],
            [a.pool, a.poolValue(database.pool.checked_out, database.pool.size)],
          ]}
        />
        <h3 className="pt-2 text-15 font-medium text-fg">{a.tables}</h3>
        <RankedList
          items={database.tables.filter((table) => table.rows > 0).slice(0, 8).map((table) => ({
            key: table.name,
            label: <span className="figure text-13">{table.name}</span>,
            value: table.size_kb,
            display: a.mb(table.size_kb / 1024),
            detail: a.rows(table.rows),
          }))}
        />
      </Panel>
    </div>
  );
}

function LatencyTable({ rows }: { rows: [string, Summary][] }) {
  const { t } = useI18n();
  const a = t.admin;
  return (
    <table className="w-full border-t border-line text-13">
      <thead>
        <tr className="border-b border-line text-left text-12 text-fg3">
          <th className="py-2 font-normal">{a.columns.source}</th>
          <th className="py-2 text-right font-normal">{a.columns.rate}</th>
          <th className="py-2 text-right font-normal">{a.columns.p50}</th>
          <th className="py-2 text-right font-normal">{a.columns.p95}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, summary]) => (
          <tr key={label} className="border-b border-line">
            <td className="h-11 text-fg">{label}</td>
            <td className="figure text-right text-fg2">{summary.rate.toFixed(1)}</td>
            <td className="figure text-right text-fg2">{summary.count ? a.ms(summary.p50) : "—"}</td>
            <td className="figure text-right text-fg">{summary.count ? a.ms(summary.p95) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LoadPanel() {
  const { t } = useI18n();
  const a = t.admin;
  const [range, setRange] = useState<SeriesRange>("1h");
  const [metric, setMetric] = useState<Metric>("updates");
  const { data } = useAdminSeries(range);
  const formatClock = (unix: number) => formatTime(unix, t.locale);

  const charts = useMemo(() => {
    if (!data) return null;
    const points = data[metric];
    const minutes = data.step / 60;
    return {
      times: points.map((point) => point.t),
      count: points.map((point) => point.count / minutes),
      errors: points.map((point) => point.errors / minutes),
      p95: points.map((point) => (point.count ? point.p95 : null)),
      p50: points.map((point) => (point.count ? point.p50 : null)),
    };
  }, [data, metric]);

  return (
    <Panel
      title={a.load}
      aside={
        <Segmented
          label={a.load}
          value={range}
          onChange={setRange}
          options={(["1h", "6h", "24h"] as const).map((value) => ({ value, label: value }))}
        />
      }
    >
      <Segmented
        label={a.load}
        value={metric}
        onChange={setMetric}
        fill
        options={(["updates", "api", "anilist", "renders"] as const).map((value) => ({ value, label: a.metrics[value] }))}
      />
      {charts ? (
        <>
          <LineChart
            label={`${a.load}, ${a.ranges[range]}`}
            times={charts.times}
            format={(value) => (value >= 10 ? formatNumber(Math.round(value), t.locale) : value.toFixed(1))}
            formatTime={formatClock}
            series={[
              { key: "count", label: a.requests, color: "var(--color-accent)", values: charts.count, area: true },
              { key: "errors", label: a.errorsLabel, color: "var(--color-score-mid)", values: charts.errors },
            ]}
          />
          <LineChart
            label={a.latency}
            height={96}
            times={charts.times}
            format={(value) => a.ms(value)}
            formatTime={formatClock}
            series={[
              { key: "p95", label: "p95", color: "var(--color-fg)", values: charts.p95 },
              { key: "p50", label: "p50", color: "var(--color-fg3)", values: charts.p50, dashed: true },
            ]}
          />
        </>
      ) : (
        <Skeleton className="h-[290px] rounded-card" />
      )}
    </Panel>
  );
}

function ServerChart() {
  const { t } = useI18n();
  const a = t.admin;
  const { data } = useAdminSeries("1h");
  if (!data) return <Skeleton className="h-[180px] rounded-card" />;
  return (
    <LineChart
      label={`${a.botCpu}, ${a.hostCpu}`}
      times={data.cpu.map((point) => point.t)}
      format={(value) => `${value.toFixed(value < 10 ? 1 : 0)}%`}
      formatTime={(unix) => formatTime(unix, t.locale)}
      series={[
        { key: "bot", label: a.botCpu, color: "var(--color-accent)", values: data.cpu.map((point) => point.avg), area: true },
        { key: "host", label: a.hostCpu, color: "var(--color-fg3)", values: data.system_cpu.map((point) => point.avg), dashed: true },
      ]}
    />
  );
}

function ActivityPanel({ eventsToday }: { eventsToday: { bot: number; app: number } }) {
  const { t } = useI18n();
  const a = t.admin;
  const { data } = useAdminDaily(30);
  const formatDay = (key: string) => formatShortDay(key, t.locale);
  return (
    <Panel title={a.activity} hint={a.activityHint}>
      {data ? (
        <DailyBars
          label={a.activity}
          bars={data.map((day) => ({ key: day.day, value: day.active }))}
          formatDay={formatDay}
          readout={(index) => (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-fg3">{a.active}</span>
                <span className="figure text-fg">{data[index].active}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-fg3">{a.joined}</span>
                <span className="figure text-fg">{data[index].joined}</span>
              </span>
            </>
          )}
        />
      ) : (
        <Skeleton className="h-[170px] rounded-card" />
      )}
      <p className="text-13 text-fg3">{a.eventsToday(eventsToday.bot, eventsToday.app)}</p>
    </Panel>
  );
}

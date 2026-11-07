"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminOverview } from "@/api/admin";
import { ApiError } from "@/api/client";
import { useSession, useSessionQuery } from "@/api/session";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/hooks";
import { haptic } from "@/lib/telegram";
import { PageHeader } from "@/components/shell/PageHeader";
import { IconButton } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { RowsSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ErrorsPanel } from "./ErrorsPanel";
import { Overview } from "./Overview";
import { UsersPanel } from "./UsersPanel";
import { LiveDot } from "./parts";

type Tab = "overview" | "users" | "errors";

export function AdminScreen() {
  const { t } = useI18n();
  const a = t.admin;
  const session = useSession();
  const { isPending: sessionPending } = useSessionQuery();
  const allowed = Boolean(session.is_admin);
  const overview = useAdminOverview();
  const [tab, setTab] = useState<Tab>("overview");
  const client = useQueryClient();
  const now = useNow(1000);

  const forbidden = (!sessionPending && !session.offline && !allowed) || (overview.error instanceof ApiError && overview.error.status === 403);
  if (forbidden) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={a.title} />
        <EmptyState title={a.forbidden} />
      </div>
    );
  }

  const updatedAgo = overview.dataUpdatedAt ? Math.max(0, now - Math.floor(overview.dataUpdatedAt / 1000)) : null;
  const errors = overview.data?.load.errors;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-24 font-semibold text-fg">{a.title}</h1>
            <span className="inline-flex items-center gap-1.5 text-12 text-fg3">
              {overview.isFetching ? <LiveDot /> : <span aria-hidden className="size-2 rounded-full bg-fg3" />}
              {updatedAgo === null ? a.live : a.updated(updatedAgo)}
            </span>
          </div>
        }
        actions={
          <IconButton
            icon={RotateCw}
            label={t.common.retry}
            onClick={() => {
              haptic.impact("light");
              void client.invalidateQueries({ queryKey: ["admin"] });
            }}
          />
        }
      />
      <Tabs
        label={a.title}
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: a.tabs.overview },
          { value: "users", label: a.tabs.users },
          {
            value: "errors",
            label: (
              <span className="inline-flex items-center gap-1.5">
                {a.tabs.errors}
                {errors && errors["1h"] > 0 ? <span className="figure rounded-chip bg-score-low/15 px-1.5 text-12 text-score-low">{errors["1h"]}</span> : null}
              </span>
            ),
          },
        ]}
      />
      {tab === "overview" ? (
        overview.data ? (
          <Overview data={overview.data} />
        ) : overview.isError ? (
          <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
        ) : (
          <div className="flex flex-col gap-4 px-4">
            <Skeleton className="h-28 rounded-card" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-card" />
              ))}
            </div>
            <RowsSkeleton count={3} height={88} />
          </div>
        )
      ) : null}
      {tab === "users" ? <UsersPanel /> : null}
      {tab === "errors" ? <ErrorsPanel hour={errors?.["1h"] ?? 0} day={errors?.["24h"] ?? 0} /> : null}
    </div>
  );
}

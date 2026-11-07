"use client";

import type { ReactNode } from "react";
import { ApiError } from "@/api/client";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export function EmptyState({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4 px-4 py-12 text-center", className)}>
      <p className="text-15 text-fg2">{title}</p>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const t = useT();
  let title = t.common.errorTitle;
  if (error instanceof ApiError) {
    if (error.isRateLimited) title = t.common.rateLimited;
    else if (error.isOffline) title = t.common.offlineBody;
    else if (error.isAuth) title = t.common.authRequired;
  }
  return (
    <EmptyState
      className={className}
      title={title}
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {t.common.retry}
          </Button>
        ) : undefined
      }
    />
  );
}

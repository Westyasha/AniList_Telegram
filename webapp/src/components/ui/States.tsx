import type { ReactNode } from "react";
import { RotateCw, SearchX, WifiOff } from "lucide-react";
import { ApiError } from "@/api/client";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-8 py-12 text-center", className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-line bg-surface-2 text-muted">
        {icon ?? <SearchX className="size-6" />}
      </div>
      <p className="text-[15px] font-bold">{title}</p>
      {body && <p className="mt-1.5 max-w-[280px] text-[13px] text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error?: unknown; onRetry?: () => void; className?: string }) {
  const t = useT();
  const apiError = error instanceof ApiError ? error : null;
  const offline = apiError?.isOffline ?? false;
  const body = offline
    ? t.common.offlineBody
    : apiError?.isRateLimited
      ? t.common.rateLimited
      : apiError?.code === "anilist_error" && apiError.detail
        ? apiError.detail
        : t.common.errorBody;
  return (
    <EmptyState
      className={className}
      icon={offline ? <WifiOff className="size-6" /> : <RotateCw className="size-6" />}
      title={t.common.errorTitle}
      body={body}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry} icon={<RotateCw className="size-4" />}>
            {t.common.retry}
          </Button>
        )
      }
    />
  );
}

"use client";

import { useAdminErrors } from "@/api/admin";
import { useI18n } from "@/lib/i18n";
import { formatRelative } from "@/lib/format";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";

export function ErrorsPanel({ hour, day }: { hour: number; day: number }) {
  const { t } = useI18n();
  const a = t.admin;
  const { data, isPending, isError, error, refetch } = useAdminErrors();

  return (
    <div className="flex flex-col gap-3 pb-8">
      <div className="px-4">
        <p className="text-15 text-fg">{a.errorsCount(hour, day)}</p>
        <p className="text-13 text-fg3">{a.errorsHint}</p>
      </div>
      {isPending ? (
        <RowsSkeleton count={5} height={88} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title={a.noErrors} />
      ) : (
        <ol className="border-t border-line">
          {data.map((record, index) => (
            <li key={`${record.at}-${index}`} className="flex flex-col gap-1.5 border-b border-line px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="figure shrink-0 text-13 text-score-low">{record.kind}</span>
                <span className="figure min-w-0 truncate text-12 text-fg3">{record.source}</span>
                <span className="ml-auto shrink-0 text-12 text-fg3">{formatRelative(record.at, t.locale)}</span>
              </div>
              <p className="figure text-12 leading-[18px] break-words whitespace-pre-wrap text-fg2">{record.message}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

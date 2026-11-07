import { cn } from "@/lib/cn";

export interface Bucket {
  key: string;
  label: string;
  value: number;
}

interface ScoreHistogramProps {
  buckets: Bucket[];
  formatValue: (value: number) => string;
  label: string;
  caption?: string;
  height?: number;
  accent?: string;
}

export function modeIndex(buckets: Bucket[]): number {
  let best = -1;
  let bestValue = 0;
  buckets.forEach((bucket, index) => {
    if (bucket.value > bestValue) {
      best = index;
      bestValue = bucket.value;
    }
  });
  return best;
}

export function ScoreHistogram({ buckets, formatValue, label, caption, height = 128, accent }: ScoreHistogramProps) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.value));
  const mode = modeIndex(buckets);
  const summary = buckets.map((bucket) => `${bucket.label}: ${formatValue(bucket.value)}`).join(", ");

  return (
    <figure className="flex flex-col gap-3">
      <div role="img" aria-label={`${label}. ${summary}`} className="flex flex-col">
        <div className="relative flex items-end gap-1.5" style={{ height }}>
          <span aria-hidden className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: 20 }} />
          <span aria-hidden className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: 20 + (height - 20) / 2 }} />
          {buckets.map((bucket, index) => {
            const ratio = bucket.value / max;
            const isMode = index === mode;
            return (
              <div key={bucket.key} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                {isMode ? <span className="figure mb-1 text-12 text-fg">{formatValue(bucket.value)}</span> : null}
                <span
                  className={cn("block w-full rounded-t-[2px]", isMode ? (accent ? undefined : "bg-accent") : "bg-fg/14")}
                  style={{
                    height: bucket.value > 0 ? Math.max(2, Math.round(ratio * (height - 20))) : 0,
                    backgroundColor: isMode && accent ? accent : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div aria-hidden className="flex gap-1.5 border-t border-line-strong pt-2">
          {buckets.map((bucket, index) => (
            <span key={bucket.key} className={cn("figure min-w-0 flex-1 text-center text-12", index === mode ? "text-fg" : "text-fg3")}>
              {bucket.label}
            </span>
          ))}
        </div>
      </div>
      {caption ? <figcaption className="text-13 text-fg3">{caption}</figcaption> : null}
    </figure>
  );
}

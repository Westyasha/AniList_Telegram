"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DailyBar {
  key: string;
  value: number;
  stack?: number;
}

interface DailyBarsProps {
  bars: DailyBar[];
  label: string;
  readout: (index: number) => ReactNode;
  formatDay: (key: string) => string;
  height?: number;
  stackColor?: string;
  className?: string;
}

export function DailyBars({ bars, label, readout, formatDay, height = 120, stackColor, className }: DailyBarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((bar) => bar.value + (bar.stack ?? 0)));
  const last = bars.length - 1;
  const active = hover ?? last;

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!bars.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(last, Math.floor(ratio * bars.length))));
  };

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <figcaption className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-13">
        {bars.length ? readout(active) : null}
        <span className="figure ml-auto text-12 text-fg3">{bars.length ? formatDay(bars[active].key) : ""}</span>
      </figcaption>
      <div
        role="img"
        aria-label={label}
        className="relative flex touch-pan-y items-end gap-[3px] select-none"
        style={{ height }}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHover(null)}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
        {bars.map((bar, index) => {
          const total = bar.value + (bar.stack ?? 0);
          const isActive = index === active;
          const isToday = index === last;
          return (
            <div key={bar.key} className="relative flex h-full min-w-0 flex-1 flex-col justify-end">
              <span
                className={cn(
                  "flex w-full flex-col justify-end overflow-hidden rounded-t-[2px] transition-opacity duration-120",
                  hover !== null && !isActive && "opacity-50",
                )}
                style={{ height: total > 0 ? `${Math.max(3, (total / max) * 100)}%` : 0 }}
              >
                {bar.stack ? (
                  <span className="block w-full" style={{ height: `${(bar.stack / total) * 100}%`, background: stackColor ?? "var(--color-fg2)", opacity: 0.55 }} />
                ) : null}
                <span className={cn("block w-full flex-1", isToday ? "bg-accent" : "bg-fg/25")} />
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="figure flex justify-between border-t border-line-strong pt-2 text-[11px] text-fg3">
        {bars.length ? (
          <>
            <span>{formatDay(bars[0].key)}</span>
            <span>{formatDay(bars[Math.floor(last / 2)].key)}</span>
            <span>{formatDay(bars[last].key)}</span>
          </>
        ) : null}
      </div>
    </figure>
  );
}

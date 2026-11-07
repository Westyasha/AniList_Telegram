"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/cn";

interface ProgressTrackProps {
  watched: number;
  aired: number | null;
  total: number | null;
  size?: "sm" | "md";
  label: string;
  onSelect?: (value: number) => void;
  selectLabel?: (value: number) => string;
  className?: string;
}

const SEGMENT_LIMIT = 40;

type SegmentState = "watched" | "aired" | "future";

const FILL: Record<SegmentState, string> = {
  watched: "bg-accent",
  aired: "bg-fg/35",
  future: "bg-s3",
};

export function trackLength(watched: number, aired: number | null, total: number | null): number {
  if (total && total > 0) return total;
  return Math.max(aired ?? 0, watched) + 1;
}

export function ProgressTrack({ watched, aired, total, size = "sm", label, onSelect, selectLabel, className }: ProgressTrackProps) {
  const length = trackLength(watched, aired, total);
  const available = Math.min(length, Math.max(aired ?? (total ? total : watched), watched));
  const height = size === "md" ? "h-2" : "h-1";
  const description = `${label}: ${watched} / ${total ?? "?"}`;

  if (length > SEGMENT_LIMIT) {
    const watchedPct = Math.min(100, (watched / length) * 100);
    const airedPct = Math.min(100, (available / length) * 100);
    const pick = (event: MouseEvent<HTMLButtonElement>) => {
      if (!onSelect) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      onSelect(Math.max(0, Math.round(ratio * length)));
    };
    const bar = (
      <span className={cn("relative block w-full overflow-hidden rounded-[1px] bg-s3", height)}>
        <span className="absolute inset-y-0 left-0 bg-fg/35" style={{ width: `${airedPct}%` }} />
        <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${watchedPct}%` }} />
        {[25, 50, 75].map((tick) => (
          <span key={tick} className="absolute inset-y-0 w-px bg-bg" style={{ left: `${tick}%` }} />
        ))}
      </span>
    );
    if (onSelect) {
      return (
        <button type="button" aria-label={description} onClick={pick} className={cn("flex h-11 w-full items-center", className)}>
          {bar}
        </button>
      );
    }
    return (
      <span role="img" aria-label={description} className={cn("flex w-full items-center", className)}>
        {bar}
      </span>
    );
  }

  const gap = length > 24 ? "gap-px" : "gap-[2px]";
  const states: SegmentState[] = Array.from({ length }, (_, index) => {
    if (index < watched) return "watched";
    if (index < available) return "aired";
    return "future";
  });

  if (onSelect) {
    return (
      <div role="group" aria-label={description} className={cn("flex h-11 w-full items-stretch", gap, className)}>
        {states.map((state, index) => (
          <button
            key={index}
            type="button"
            aria-label={selectLabel ? selectLabel(index + 1) : `${index + 1}`}
            aria-pressed={index < watched}
            onClick={() => onSelect(index + 1 === watched ? index : index + 1)}
            className="group flex min-w-0 flex-1 items-center"
          >
            <span className={cn("block w-full rounded-[1px] transition-colors duration-120", height, FILL[state])} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <span role="img" aria-label={description} className={cn("flex w-full", gap, className)}>
      {states.map((state, index) => (
        <span key={index} className={cn("block min-w-0 flex-1 rounded-[1px]", height, FILL[state])} />
      ))}
    </span>
  );
}

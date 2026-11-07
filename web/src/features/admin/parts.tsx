"use client";

import type { ReactNode } from "react";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";

export function Panel({ title, hint, aside, children, className }: { title: string; hint?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 px-4", className)}>
      <header className="flex min-h-11 items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-17 font-semibold text-fg">{title}</h2>
          {hint ? <p className="truncate text-13 text-fg3">{hint}</p> : null}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, detail, tone }: { label: string; value: ReactNode; detail?: ReactNode; tone?: "warn" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-card border border-line bg-s1 p-4">
      <span className="truncate text-13 text-fg3">{label}</span>
      <span className={cn("figure truncate text-24 font-medium", tone === "warn" ? "text-score-low" : "text-fg")}>{value}</span>
      {detail ? <span className="truncate text-12 text-fg2">{detail}</span> : null}
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({ options, value, onChange, label, fill = false, className }: { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; label: string; fill?: boolean; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("rounded-control bg-s2 p-0.5", fill ? "flex w-full" : "inline-flex shrink-0", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (active) return;
              haptic.selection();
              onChange(option.value);
            }}
            className={cn(
              "h-9 rounded-[6px] px-3 text-13 whitespace-nowrap transition-colors duration-120",
              fill ? "min-w-0 flex-1 truncate" : "shrink-0",
              active ? "bg-s3 font-medium text-fg shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-fg2 hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Meter({ value, max, className }: { value: number; max: number; className?: string }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <span aria-hidden className={cn("block h-1.5 overflow-hidden rounded-full bg-s3", className)}>
      <span
        className={cn("block h-full rounded-full transition-[width] duration-300", ratio > 0.85 ? "bg-score-low" : ratio > 0.6 ? "bg-score-mid" : "bg-accent")}
        style={{ width: `${ratio * 100}%` }}
      />
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-2", className)}>
      <span className="absolute inset-0 animate-ping rounded-full bg-score-high opacity-60 motion-reduce:hidden" />
      <span className="relative size-2 rounded-full bg-score-high" />
    </span>
  );
}

export function SplitBar({ parts }: { parts: { key: string; label: string; value: number; color: string }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-s3">
        {parts.map((part) => (
          <span key={part.key} className="block h-full" style={{ width: `${(part.value / total) * 100}%`, background: part.color }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-13">
        {parts.map((part) => (
          <li key={part.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: part.color }} />
            <span className="text-fg2">{part.label}</span>
            <span className="figure text-fg">{part.value}</span>
            <span className="figure text-fg3">{Math.round((part.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

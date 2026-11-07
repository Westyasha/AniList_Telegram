import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number | null;
  label: string;
  className?: string;
}

export function Stepper({ value, onChange, min = 0, max, label, className }: StepperProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const clamp = (next: number) => {
    const lower = Math.max(min, next);
    return max != null && max > 0 ? Math.min(max, lower) : lower;
  };

  const step = (delta: number) => {
    const next = clamp(value + delta);
    if (next === value) return;
    haptic.selection();
    onChange(next);
  };

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) ? clamp(parsed) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const atMin = value <= min;
  const atMax = max != null && max > 0 && value >= max;

  return (
    <div className={cn("flex h-12 items-center rounded-xl border border-line bg-surface-2", className)}>
      <button
        type="button"
        aria-label={`${label} −1`}
        disabled={atMin}
        onClick={() => step(-1)}
        className="flex h-full w-12 items-center justify-center text-muted transition-colors hover:text-fg disabled:opacity-30"
      >
        <Minus className="size-4" />
      </button>
      <label className="flex flex-1 items-baseline justify-center gap-1">
        <span className="sr-only">{label}</span>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 5))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") (event.target as HTMLInputElement).blur();
          }}
          className="tabular w-14 bg-transparent text-right text-lg font-bold outline-none"
        />
        <span className="tabular min-w-10 text-sm font-semibold text-faint">{max ? `/ ${max}` : ""}</span>
      </label>
      <button
        type="button"
        aria-label={`${label} +1`}
        disabled={atMax}
        onClick={() => step(1)}
        className="flex h-full w-12 items-center justify-center text-muted transition-colors hover:text-fg disabled:opacity-30"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

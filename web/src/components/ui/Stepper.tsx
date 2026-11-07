"use client";

import { Minus, Plus } from "lucide-react";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";
import { IconButton } from "./Button";

interface StepperProps {
  value: number;
  max?: number | null;
  onChange: (value: number) => void;
  label: string;
  showMax?: boolean;
}

export function Stepper({ value, max, onChange, label, showMax = true }: StepperProps) {
  const t = useT();
  const set = (next: number) => {
    const clamped = Math.max(0, max ? Math.min(max, next) : next);
    if (clamped === value) return;
    haptic.selection();
    onChange(clamped);
  };

  return (
    <div className="flex h-11 items-center rounded-control border border-line bg-s2">
      <IconButton icon={Minus} label={`${label}: ${t.list.editor.decrease}`} onClick={() => set(value - 1)} disabled={value <= 0} />
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <span className="sr-only">{label}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max ?? undefined}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) set(Math.floor(next));
          }}
          className="figure w-14 bg-transparent text-right text-17 text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        {showMax ? <span className="figure text-13 text-fg3">/ {max ?? "?"}</span> : null}
      </label>
      <IconButton icon={Plus} label={`${label}: ${t.list.editor.increase}`} onClick={() => set(value + 1)} disabled={Boolean(max && value >= max)} />
    </div>
  );
}

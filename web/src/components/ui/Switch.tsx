"use client";

import { useId } from "react";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, hint, disabled = false, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex min-h-12 items-center gap-4 py-2", disabled && "opacity-50", className)}>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-15 text-fg">{label}</span>
        {hint ? <span className="block text-13 text-fg3">{hint}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          haptic.selection();
          onChange(!checked);
        }}
        className="hit relative inline-flex h-6 w-10 shrink-0 items-center"
      >
        <span className={cn("absolute inset-0 rounded-full transition-colors duration-120", checked ? "bg-accent" : "bg-s3")} />
        <span className={cn("relative ml-0.5 size-5 rounded-full bg-fg transition-transform duration-120", checked ? "translate-x-4" : "translate-x-0")} />
      </button>
    </div>
  );
}

import { useId } from "react";
import * as m from "motion/react-m";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/telegram";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  label?: string;
}

export function Segmented<T extends string>({ options, value, onChange, className, size = "md", label }: SegmentedProps<T>) {
  const layoutId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("relative flex rounded-xl border border-line bg-surface p-1", className)}
    >
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
              "relative flex-1 rounded-lg px-2 font-semibold transition-colors",
              size === "sm" ? "h-9 text-xs" : "h-10 text-[13px]",
              active ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {active && (
              <m.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-surface-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
              {option.color && <span className="size-1.5 rounded-full" style={{ background: option.color }} aria-hidden />}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

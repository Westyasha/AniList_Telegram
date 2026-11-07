import { useId } from "react";
import * as m from "motion/react-m";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/telegram";

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  const layoutId = useId();
  return (
    <div role="tablist" className={cn("no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-2", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => {
              if (active) return;
              haptic.selection();
              onChange(item.value);
            }}
            className={cn(
              "relative h-12 shrink-0 px-3 text-[13px] font-semibold transition-colors",
              active ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {item.label}
            {active && (
              <m.span
                layoutId={layoutId}
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--accent-text)]"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

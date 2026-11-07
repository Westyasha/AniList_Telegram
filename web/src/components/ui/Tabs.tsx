"use client";

import type { ReactNode } from "react";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Facet } from "@/components/brand/Mark";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div className={cn("border-b border-line", className)}>
      <div role="tablist" aria-label={label} className="no-scrollbar flex gap-6 overflow-x-auto px-4">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (active) return;
                haptic.selection();
                onChange(item.value);
              }}
              className={cn(
                "relative flex h-11 shrink-0 items-center text-15 transition-colors duration-120",
                active ? "font-medium text-fg" : "text-fg3 hover:text-fg2",
              )}
            >
              {item.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 bottom-0 flex justify-center transition-opacity duration-120",
                  active ? "opacity-100" : "opacity-0",
                )}
              >
                <Facet direction="up" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

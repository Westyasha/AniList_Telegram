"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

const FADE = 24;

export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const max = list.scrollWidth - list.clientWidth;
    setEdges({ start: list.scrollLeft > 1, end: list.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure, items.length]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [value]);

  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? "transparent" : "black"} 0, black ${FADE}px, black calc(100% - ${FADE}px), ${edges.end ? "transparent" : "black"} 100%)`
      : undefined;

  return (
    <div className={cn("border-b border-line", className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onScroll={measure}
        onWheel={(event) => {
          const list = listRef.current;
          if (list && Math.abs(event.deltaY) > Math.abs(event.deltaX)) list.scrollLeft += event.deltaY;
        }}
        className={cn(
          "no-scrollbar flex overflow-x-auto scroll-px-4 px-4",
          items.length >= 4 ? "justify-between gap-3" : "gap-6",
        )}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
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
                "relative flex h-11 shrink-0 items-center text-15 whitespace-nowrap transition-colors duration-120",
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

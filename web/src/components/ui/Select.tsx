"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { Popover, usePopover } from "./Popover";

export interface SelectOption<T extends string | number> {
  value: T;
  label: ReactNode;
}

interface SelectProps<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  variant?: "field" | "inline";
  icon?: ReactNode;
  align?: "start" | "end";
  mono?: boolean;
  className?: string;
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  variant = "field",
  icon,
  align = "start",
  mono = false,
  className,
}: SelectProps<T>) {
  const { open, setOpen, close, anchorRef } = usePopover();
  const listId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [active, setActive] = useState(selectedIndex);
  const listRef = useRef<HTMLUListElement>(null);
  const current = options[selectedIndex];

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
      listRef.current?.focus();
    });
  }, [open, selectedIndex]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (option.value !== value) {
      haptic.selection();
      onChange(option.value);
    }
    close();
  };

  const move = (next: number) => {
    const index = Math.min(options.length - 1, Math.max(0, next));
    setActive(index);
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openList();
          }
        }}
        className={cn(
          variant === "field"
            ? "flex h-11 w-full items-center gap-2 rounded-control border border-line bg-s2 px-3 text-left text-15 text-fg transition-colors hover:border-line-strong"
            : "inline-flex h-11 items-center gap-2 rounded-control px-3 text-13 text-fg2 transition-colors hover:bg-s2 hover:text-fg",
          open && variant === "field" && "border-line-strong",
          open && variant === "inline" && "bg-s2 text-fg",
          className,
        )}
      >
        {icon}
        <span className={cn("min-w-0 flex-1 truncate", mono && "figure")}>{current?.label}</span>
        <Icon icon={ChevronDown} className={cn("shrink-0 text-fg3 transition-transform duration-120", open && "rotate-180")} />
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={close} align={align} matchWidth={variant === "field"} minWidth={variant === "field" ? 160 : 200}>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") move(active + 1);
            else if (event.key === "ArrowUp") move(active - 1);
            else if (event.key === "Home") move(0);
            else if (event.key === "End") move(options.length - 1);
            else if (event.key === "Enter" || event.key === " ") choose(active);
            else if (event.key === "Tab") close();
            else return;
            event.preventDefault();
          }}
          className="max-h-[inherit] overflow-y-auto overscroll-contain p-1 outline-none"
        >
          {options.map((option, index) => {
            const selected = index === selectedIndex;
            return (
              <li
                key={String(option.value)}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(index)}
                className={cn(
                  "flex h-11 cursor-pointer items-center gap-3 rounded-control px-3 text-15 transition-colors",
                  index === active ? "bg-s3 text-fg" : "text-fg2",
                  selected && "text-fg",
                )}
              >
                <span className={cn("min-w-0 flex-1 truncate", mono && "figure")}>{option.label}</span>
                {selected ? <Icon icon={Check} className="shrink-0 text-accent-ink" /> : null}
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}

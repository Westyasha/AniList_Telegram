"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { Popover, usePopover } from "./Popover";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

function parse(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function serialize(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sameDay(a: Date | null, b: Date): boolean {
  return Boolean(a) && a!.getFullYear() === b.getFullYear() && a!.getMonth() === b.getMonth() && a!.getDate() === b.getDate();
}

export function DatePicker({ value, onChange, label }: DatePickerProps) {
  const t = useT();
  const { open, setOpen, close, anchorRef } = usePopover();
  const selected = parse(value);
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => new Date((selected ?? today).getFullYear(), (selected ?? today).getMonth(), 1));
  const mondayFirst = t.locale.startsWith("ru");

  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, mondayFirst ? 1 : 7);
    return Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(t.locale, { weekday: "narrow" }).format(new Date(base.getFullYear(), 0, base.getDate() + index)),
    );
  }, [mondayFirst, t.locale]);

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() - (mondayFirst ? 1 : 0) + 7) % 7;
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: days }, (_, index) => new Date(view.getFullYear(), view.getMonth(), index + 1)),
    ];
  }, [view, mondayFirst]);

  const title = new Intl.DateTimeFormat(t.locale, { month: "long", year: "numeric" }).format(view);
  const display = selected ? new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "short", year: "numeric" }).format(selected) : "—";

  const pick = (date: Date | null) => {
    haptic.selection();
    onChange(date ? serialize(date) : "");
    close();
  };

  const shift = (months: number) => setView((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          if (!open) setView(new Date((selected ?? today).getFullYear(), (selected ?? today).getMonth(), 1));
          setOpen(!open);
        }}
        className={cn(
          "flex h-11 w-full min-w-0 items-center gap-2 rounded-control border border-line bg-s2 px-3 text-left transition-colors hover:border-line-strong",
          open && "border-line-strong",
        )}
      >
        <span className={cn("figure min-w-0 flex-1 truncate text-13", selected ? "text-fg" : "text-fg3")}>{display}</span>
        <Icon icon={CalendarDays} className="text-fg3" />
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={close} minWidth={288} preferredHeight={380}>
        <div role="dialog" aria-label={label} className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} aria-label={t.common.back} className="grid size-9 place-items-center rounded-control text-fg2 transition-colors hover:bg-s3 hover:text-fg">
              <Icon icon={ChevronLeft} />
            </button>
            <span className="text-15 font-medium text-fg capitalize">{title}</span>
            <button type="button" onClick={() => shift(1)} aria-label={t.common.next} className="grid size-9 place-items-center rounded-control text-fg2 transition-colors hover:bg-s3 hover:text-fg">
              <Icon icon={ChevronRight} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-12 text-fg3">
            {weekdays.map((day, index) => (
              <span key={index} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, index) =>
              date ? (
                <button
                  key={index}
                  type="button"
                  onClick={() => pick(date)}
                  aria-pressed={sameDay(selected, date)}
                  className={cn(
                    "figure grid h-9 place-items-center rounded-control text-13 transition-colors",
                    sameDay(selected, date)
                      ? "bg-accent font-semibold text-on-accent"
                      : sameDay(today, date)
                        ? "text-accent-ink hover:bg-s3"
                        : "text-fg hover:bg-s3",
                  )}
                >
                  {date.getDate()}
                </button>
              ) : (
                <span key={index} />
              ),
            )}
          </div>
          <div className="flex items-center justify-between border-t border-line pt-2">
            <button type="button" onClick={() => pick(today)} className="h-9 rounded-control px-2 text-13 text-fg2 transition-colors hover:bg-s3 hover:text-fg">
              {t.common.today}
            </button>
            {selected ? (
              <button type="button" onClick={() => pick(null)} className="h-9 rounded-control px-2 text-13 text-fg3 transition-colors hover:bg-s3 hover:text-fg">
                {t.common.clear}
              </button>
            ) : null}
          </div>
        </div>
      </Popover>
    </>
  );
}

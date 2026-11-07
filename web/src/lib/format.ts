import type { FuzzyDate } from "@/api/types";
import type { Dict } from "./i18n";

export function splitDuration(totalSeconds: number): { d: number; h: number; m: number } {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return {
    d: Math.floor(seconds / 86400),
    h: Math.floor((seconds % 86400) / 3600),
    m: Math.max(seconds < 60 ? 1 : 0, Math.floor((seconds % 3600) / 60)),
  };
}

export function formatCountdown(seconds: number, t: Dict): string {
  const { d, h, m } = splitDuration(seconds);
  return t.common.countdown(d, h, m);
}

export function formatTime(unix: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(unix * 1000));
}

export function formatWeekday(date: Date, locale: string, style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(date);
}

export function formatDayMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
}

export function formatFuzzyDate(date: FuzzyDate | null | undefined, locale: string): string | null {
  if (!date?.year) return null;
  if (date.month && date.day) {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(
      new Date(date.year, date.month - 1, date.day),
    );
  }
  if (date.month) {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short" }).format(new Date(date.year, date.month - 1, 1));
  }
  return `${date.year}`;
}

export function formatBirthday(date: FuzzyDate | null | undefined, locale: string): string | null {
  if (!date?.month || !date.day) return date?.year ? `${date.year}` : null;
  const options: Intl.DateTimeFormatOptions = date.year
    ? { year: "numeric", month: "long", day: "numeric" }
    : { month: "long", day: "numeric" };
  return new Intl.DateTimeFormat(locale, options).format(new Date(date.year ?? 2000, date.month - 1, date.day));
}

export function formatNumber(value: number | null | undefined, locale: string): string {
  return (value ?? 0).toLocaleString(locale);
}

export function formatCompact(value: number | null | undefined, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value ?? 0);
}

export function formatRelative(unix: number, locale: string): string {
  const diff = unix - Date.now() / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function fuzzyToInput(date: FuzzyDate | null | undefined): string {
  if (!date?.year || !date.month || !date.day) return "";
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function inputToFuzzy(value: string): FuzzyDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: null, month: null, day: null };
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function todayFuzzy(): FuzzyDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function hasFuzzy(date: FuzzyDate | null | undefined): boolean {
  return Boolean(date?.year);
}

export function regionName(code: string | null | undefined, locale: string): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

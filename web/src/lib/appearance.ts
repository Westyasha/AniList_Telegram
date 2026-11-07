import { createStore, readLocal, writeLocal } from "@/lib/store";
import { profileAccent } from "@/lib/profileColor";
import { STORAGE_KEY } from "@/lib/appearanceBoot";

export const THEMES = ["dark", "light", "system", "glass"] as const;
export const ACCENTS = ["crimson", "profile", "blue", "violet", "green", "amber", "pink", "teal"] as const;

export type Theme = (typeof THEMES)[number];
export type Accent = (typeof ACCENTS)[number];
export type ResolvedTheme = "dark" | "light" | "glass";

export interface Appearance {
  theme: Theme;
  accent: Accent;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: "dark", accent: "crimson" };

export const ACCENT_HEX: Record<Exclude<Accent, "profile">, string> = {
  crimson: "#E0233D",
  blue: "#3D8BF2",
  violet: "#8B6CF2",
  green: "#2FB574",
  amber: "#E8A23A",
  pink: "#E5539A",
  teal: "#22AFAF",
};

export const SURFACE: Record<ResolvedTheme, string> = {
  dark: "#0B0B0D",
  light: "#F5F5F7",
  glass: "#07070A",
};

export function normalizeAppearance(value: unknown): Appearance {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof Appearance, unknown>>;
  return {
    theme: THEMES.includes(raw.theme as Theme) ? (raw.theme as Theme) : DEFAULT_APPEARANCE.theme,
    accent: ACCENTS.includes(raw.accent as Accent) ? (raw.accent as Accent) : DEFAULT_APPEARANCE.accent,
  };
}

export const appearanceStore = createStore<Appearance>(DEFAULT_APPEARANCE);
export const profileColorStore = createStore<string | null>(null);
export const ambientStore = createStore<string | null>(null);

function channel(hex: string, index: number): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

function mix(hex: string, target: number, amount: number): string {
  const parts = [0, 1, 2].map((index) => Math.round(channel(hex, index) + (target - channel(hex, index)) * amount));
  return `#${parts.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [0, 1, 2].map((index) => {
    const value = channel(hex, index) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function accentHex(accent: Accent, profileColor: string | null): string {
  return accent === "profile" ? profileAccent(profileColor) : ACCENT_HEX[accent];
}

export function systemPrefersLight(): boolean {
  if (typeof window === "undefined") return false;
  const scheme = window.Telegram?.WebApp?.colorScheme;
  if (scheme) return scheme === "light";
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return systemPrefersLight() ? "light" : "dark";
  return theme;
}

export function applyAppearance(appearance: Appearance, profileColor: string | null): ResolvedTheme {
  const resolved = resolveTheme(appearance.theme);
  const root = document.documentElement;
  const base = accentHex(appearance.accent, profileColor);
  const light = resolved === "light";
  const onAccent = luminance(base) > 0.45 ? "#0B0B0D" : "#FFFFFF";
  root.dataset.theme = resolved;
  root.style.setProperty("--color-accent", base);
  root.style.setProperty("--color-accent-press", mix(base, 0, 0.12));
  root.style.setProperty("--color-accent-ink", light ? mix(base, 0, 0.2) : mix(base, 255, 0.22));
  root.style.setProperty("--color-on-accent", onAccent);
  root.style.colorScheme = light ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", SURFACE[resolved]);
  return resolved;
}

export function loadAppearance(): Appearance {
  return normalizeAppearance(readLocal<unknown>(STORAGE_KEY, DEFAULT_APPEARANCE));
}

export function saveAppearance(appearance: Appearance): void {
  writeLocal(STORAGE_KEY, appearance);
}

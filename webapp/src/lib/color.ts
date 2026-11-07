import type { CSSProperties } from "react";

const FALLBACK = "#E0233D";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };

function parseHex(input: string | null | undefined): Rgb | null {
  if (!input) return null;
  const hex = input.trim().replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  };
}

export interface Accent {
  base: string;
  text: string;
  soft: string;
  rgb: string;
}

export function accentFrom(color: string | null | undefined): Accent {
  const parsed = parseHex(color) ?? parseHex(FALLBACK) ?? WHITE;
  let readable = parsed;
  for (let guard = 0; luminance(readable) < 0.2 && guard < 12; guard += 1) {
    readable = mix(readable, WHITE, 0.16);
  }
  const r = Math.round(readable.r);
  const g = Math.round(readable.g);
  const b = Math.round(readable.b);
  return {
    base: toHex(parsed),
    text: toHex(readable),
    soft: `rgba(${r}, ${g}, ${b}, 0.14)`,
    rgb: `${Math.round(parsed.r)} ${Math.round(parsed.g)} ${Math.round(parsed.b)}`,
  };
}

export function accentStyle(color: string | null | undefined): CSSProperties {
  const accent = accentFrom(color);
  return {
    "--accent": accent.base,
    "--accent-text": accent.text,
    "--accent-soft": accent.soft,
    "--accent-rgb": accent.rgb,
  } as CSSProperties;
}

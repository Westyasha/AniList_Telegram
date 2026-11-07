import type { ScoreFormat } from "@/api/types";

export interface ScoreScale {
  min: number;
  max: number;
  step: number;
}

export const SCALES: Record<ScoreFormat, ScoreScale> = {
  POINT_100: { min: 0, max: 100, step: 1 },
  POINT_10_DECIMAL: { min: 0, max: 10, step: 0.1 },
  POINT_10: { min: 0, max: 10, step: 1 },
  POINT_5: { min: 0, max: 5, step: 1 },
  POINT_3: { min: 0, max: 3, step: 1 },
};

const SMILEY_RAW = [0, 35, 60, 85] as const;

export function rawToValue(raw: number | null | undefined, format: ScoreFormat): number {
  const value = raw ?? 0;
  if (value <= 0) return 0;
  switch (format) {
    case "POINT_100":
      return Math.round(value);
    case "POINT_10_DECIMAL":
      return Math.round(value) / 10;
    case "POINT_10":
      return Math.max(1, Math.round(value / 10));
    case "POINT_5":
      return Math.max(1, Math.round(value / 20));
    case "POINT_3":
      if (value < 48) return 1;
      if (value < 73) return 2;
      return 3;
  }
}

export function valueToRaw(value: number, format: ScoreFormat): number {
  if (value <= 0) return 0;
  switch (format) {
    case "POINT_100":
      return Math.min(100, Math.round(value));
    case "POINT_10_DECIMAL":
      return Math.min(100, Math.round(value * 10));
    case "POINT_10":
      return Math.min(100, Math.round(value) * 10);
    case "POINT_5":
      return Math.min(100, Math.round(value) * 20);
    case "POINT_3":
      return SMILEY_RAW[Math.min(3, Math.round(value))];
  }
}

export function formatScoreValue(value: number, format: ScoreFormat): string {
  if (value <= 0) return "";
  return format === "POINT_10_DECIMAL" ? value.toFixed(1) : `${value}`;
}

export function clampScore(value: number, format: ScoreFormat): number {
  const scale = SCALES[format];
  const clamped = Math.min(scale.max, Math.max(scale.min, value));
  return Number((Math.round(clamped / scale.step) * scale.step).toFixed(1));
}

export function scoreTone(percent: number | null | undefined): string {
  if (percent == null) return "var(--color-muted)";
  if (percent >= 75) return "var(--color-completed)";
  if (percent >= 60) return "var(--color-planning)";
  return "var(--color-dropped)";
}

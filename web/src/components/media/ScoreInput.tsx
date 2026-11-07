"use client";

import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import type { ScoreFormat } from "@/api/types";
import { formatScoreValue, rawToValue, SCALES, scoreTone, valueToRaw } from "@/lib/score";
import { haptic } from "@/lib/telegram";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { FACES } from "./Marks";

interface ScoreInputProps {
  raw: number;
  format: ScoreFormat;
  onChange: (raw: number) => void;
}

export function ScoreInput({ raw, format, onChange }: ScoreInputProps) {
  const t = useT();
  const value = rawToValue(raw, format);

  const pick = (next: number) => {
    haptic.selection();
    onChange(next === value ? 0 : valueToRaw(next, format));
  };

  if (format === "POINT_5" || format === "POINT_3") {
    const options = format === "POINT_5" ? [1, 2, 3, 4, 5] : [1, 2, 3];
    return (
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t.list.editor.score}>
        {options.map((option) => {
          const Glyph = format === "POINT_5" ? Star : FACES[option - 1];
          const active = format === "POINT_5" ? option <= value : option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={value === option}
              aria-label={`${option}`}
              onClick={() => pick(option)}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-control transition-colors duration-120 hover:bg-s2",
                active ? "text-fg" : "text-fg3",
              )}
            >
              <Glyph aria-hidden size={18} strokeWidth={1.5} className={cn(format === "POINT_5" && active && "fill-current")} />
            </button>
          );
        })}
        <span className="figure ml-auto text-13 text-fg3">{value ? `${value} / ${options.length}` : t.list.editor.noScore}</span>
      </div>
    );
  }

  const scale = SCALES[format];
  const fill = `${(value / scale.max) * 100}%`;
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        className="range min-w-0 flex-1"
        min={scale.min}
        max={scale.max}
        step={scale.step}
        value={value}
        aria-label={t.list.editor.score}
        style={{ "--fill": fill } as CSSProperties}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (next !== value) haptic.selection();
          onChange(valueToRaw(next, format));
        }}
      />
      <span className="w-20 text-right">
        {value ? (
          <span className="figure text-20" style={{ color: scoreTone(raw) }}>
            {formatScoreValue(value, format)}
            <span className="text-13 text-fg3"> / {scale.max}</span>
          </span>
        ) : (
          <span className="text-13 text-fg3">{t.list.editor.noScore}</span>
        )}
      </span>
    </div>
  );
}

import type { CSSProperties } from "react";
import { Frown, Meh, Smile, Star } from "lucide-react";
import type { ScoreFormat } from "@/api/types";
import { formatScoreValue, rawToValue, SCALES, valueToRaw } from "@/lib/score";
import { haptic } from "@/lib/telegram";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";

interface ScoreInputProps {
  raw: number;
  format: ScoreFormat;
  onChange: (raw: number) => void;
}

const FACES = [
  { value: 1, Icon: Frown, color: "var(--color-dropped)" },
  { value: 2, Icon: Meh, color: "var(--color-planning)" },
  { value: 3, Icon: Smile, color: "var(--color-completed)" },
] as const;

export function ScoreInput({ raw, format, onChange }: ScoreInputProps) {
  const t = useT();
  const value = rawToValue(raw, format);

  const pick = (next: number) => {
    haptic.selection();
    onChange(next === value ? 0 : valueToRaw(next, format));
  };

  if (format === "POINT_5") {
    return (
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t.list.editor.score}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star}`}
            onClick={() => pick(star)}
            className="flex size-11 items-center justify-center rounded-lg transition-transform active:scale-90"
          >
            <Star
              className={cn("size-7 transition-colors", star <= value ? "fill-planning text-planning" : "text-faint")}
              strokeWidth={1.75}
            />
          </button>
        ))}
        <span className="ml-auto text-xs font-semibold text-faint">{value ? `${value} / 5` : t.list.editor.noScore}</span>
      </div>
    );
  }

  if (format === "POINT_3") {
    return (
      <div className="flex items-center gap-2" role="radiogroup" aria-label={t.list.editor.score}>
        {FACES.map(({ value: face, Icon, color }) => {
          const active = value === face;
          return (
            <button
              key={face}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${face}`}
              onClick={() => pick(face)}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-xl border transition-colors",
                active ? "border-transparent bg-surface-3" : "border-line bg-surface-2",
              )}
            >
              <Icon className="size-7" style={{ color: active ? color : "var(--color-faint)" }} strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
    );
  }

  const scale = SCALES[format];
  const fill = `${(value / scale.max) * 100}%`;
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        className="range flex-1"
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
      <span className="tabular w-16 text-right text-lg font-bold">
        {value ? (
          <>
            {formatScoreValue(value, format)}
            <span className="text-xs font-semibold text-faint"> / {scale.max}</span>
          </>
        ) : (
          <span className="text-xs font-semibold text-faint">{t.list.editor.noScore}</span>
        )}
      </span>
    </div>
  );
}

export function ScoreDisplay({ raw, format, className }: { raw: number | null | undefined; format: ScoreFormat; className?: string }) {
  const value = rawToValue(raw, format);
  if (!value) return null;
  if (format === "POINT_3") {
    const face = FACES[value - 1];
    return <face.Icon className={cn("size-4", className)} style={{ color: face.color }} aria-label={`${value}/3`} />;
  }
  if (format === "POINT_5") {
    return (
      <span className={cn("inline-flex items-center gap-0.5 font-bold", className)}>
        <Star className="size-3.5 fill-planning text-planning" aria-hidden />
        <span className="tabular">{value}</span>
      </span>
    );
  }
  return <span className={cn("tabular font-bold", className)}>{formatScoreValue(value, format)}</span>;
}

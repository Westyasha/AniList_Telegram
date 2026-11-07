import { Frown, Meh, Smile } from "lucide-react";
import type { MediaListStatus, ScoreFormat } from "@/api/types";
import { formatScoreValue, rawToValue, scoreTone } from "@/lib/score";
import { STATUS_COLOR } from "@/lib/status";
import { cn } from "@/lib/cn";

export function StatusDot({ status, className }: { status: MediaListStatus; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-1.5 shrink-0 rounded-full", className)} style={{ background: STATUS_COLOR[status] }} />;
}

export function AverageScore({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null || value <= 0) return null;
  return (
    <span className={cn("figure", className)} style={{ color: scoreTone(value) }}>
      {value}%
    </span>
  );
}

export const FACES = [Frown, Meh, Smile] as const;

export function UserScore({ raw, format, className }: { raw: number | null | undefined; format: ScoreFormat; className?: string }) {
  const value = rawToValue(raw, format);
  if (!value) return null;
  const percent = raw ?? 0;
  if (format === "POINT_3") {
    const Face = FACES[value - 1];
    return (
      <span className={cn("inline-flex", className)} style={{ color: scoreTone(percent) }} aria-label={`${value}/3`}>
        <Face aria-hidden size={18} strokeWidth={1.5} />
      </span>
    );
  }
  const text = format === "POINT_5" ? `${value}/5` : formatScoreValue(value, format);
  return (
    <span className={cn("figure", className)} style={{ color: scoreTone(percent) }}>
      {text}
    </span>
  );
}

import type { MediaListStatus, MediaType } from "@/api/types";
import type { Dict } from "@/lib/i18n";

export const LIST_STATUSES: MediaListStatus[] = ["CURRENT", "REPEATING", "COMPLETED", "PAUSED", "DROPPED", "PLANNING"];

export const STATUS_COLOR: Record<MediaListStatus, string> = {
  CURRENT: "var(--color-st-watching)",
  REPEATING: "var(--color-st-repeating)",
  COMPLETED: "var(--color-st-completed)",
  PAUSED: "var(--color-st-paused)",
  DROPPED: "var(--color-st-dropped)",
  PLANNING: "var(--color-st-planning)",
};

export function statusLabel(t: Dict, type: MediaType, status: MediaListStatus): string {
  return type === "MANGA" ? t.list.manga[status] : t.list.anime[status];
}

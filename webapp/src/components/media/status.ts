import type { MediaListStatus, MediaType } from "@/api/types";
import type { Dict } from "@/lib/i18n";

export const LIST_STATUSES: MediaListStatus[] = ["CURRENT", "REPEATING", "COMPLETED", "PAUSED", "DROPPED", "PLANNING"];

export const STATUS_COLOR: Record<MediaListStatus, string> = {
  CURRENT: "var(--color-watching)",
  REPEATING: "var(--color-repeating)",
  COMPLETED: "var(--color-completed)",
  PAUSED: "var(--color-paused)",
  DROPPED: "var(--color-dropped)",
  PLANNING: "var(--color-planning)",
};

export function statusLabel(t: Dict, type: MediaType, status: MediaListStatus): string {
  return type === "MANGA" ? t.list.manga[status] : t.list.anime[status];
}

import { createStore } from "./store";

export type ToastTone = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; run: () => void };
}

export const toastStore = createStore<ToastItem[]>([]);

let seq = 0;
const recent = new Map<string, number>();

function push(tone: ToastTone, message: string, action?: ToastItem["action"]): void {
  const now = Date.now();
  const last = recent.get(message);
  if (last && now - last < 2500) return;
  recent.set(message, now);
  seq += 1;
  const id = seq;
  toastStore.set((prev) => [...prev.slice(-2), { id, tone, message, action }]);
  window.setTimeout(() => dismissToast(id), action ? 6000 : 3600);
}

export function dismissToast(id: number): void {
  toastStore.set((prev) => prev.filter((item) => item.id !== id));
}

export const toast = {
  info: (message: string, action?: ToastItem["action"]) => push("info", message, action),
  success: (message: string, action?: ToastItem["action"]) => push("success", message, action),
  error: (message: string, action?: ToastItem["action"]) => push("error", message, action),
};

"use client";

import { dismissToast, toastStore, type ToastTone } from "@/lib/toast";
import { useStore } from "@/lib/store";

const DOT: Record<ToastTone, string> = {
  info: "bg-fg3",
  success: "bg-score-high",
  error: "bg-score-low",
};

export function Toaster() {
  const items = useStore(toastStore);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex max-w-[560px] flex-col gap-2 px-4"
      style={{ bottom: "calc(var(--app-bottom) + 12px)" }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === "error" ? "alert" : "status"}
          className="pointer-events-auto flex min-h-11 items-center gap-3 rounded-control border border-line bg-s3 py-2 pr-2 pl-4 text-13 text-fg transition-[transform,opacity] duration-220 starting:translate-y-2 starting:opacity-0"
        >
          <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${DOT[item.tone]}`} />
          <span className="min-w-0 flex-1">{item.message}</span>
          {item.action ? (
            <button
              type="button"
              onClick={() => {
                item.action?.run();
                dismissToast(item.id);
              }}
              className="h-9 rounded-control px-3 text-13 font-medium text-accent-ink transition-colors hover:bg-s2"
            >
              {item.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

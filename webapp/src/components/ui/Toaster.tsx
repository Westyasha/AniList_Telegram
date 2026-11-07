import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { dismissToast, toastStore, type ToastTone } from "@/lib/toast";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";

const ICONS: Record<ToastTone, typeof Info> = {
  info: Info,
  success: CircleCheck,
  error: CircleAlert,
};

const TONES: Record<ToastTone, string> = {
  info: "text-watching",
  success: "text-completed",
  error: "text-dropped",
};

export function Toaster() {
  const items = useStore(toastStore);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(var(--app-bottom) + 12px)" }}
      aria-live="polite"
      role="status"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <m.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
              className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl border border-line-strong bg-surface-3/95 px-4 py-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md"
              onClick={() => dismissToast(item.id)}
            >
              <Icon className={cn("size-5 shrink-0", TONES[item.tone])} aria-hidden />
              <p className="min-w-0 flex-1 text-[13px] leading-snug font-semibold">{item.message}</p>
              {item.action && (
                <button
                  type="button"
                  className="h-9 shrink-0 rounded-lg px-3 text-[13px] font-bold text-primary-hover"
                  onClick={(event) => {
                    event.stopPropagation();
                    item.action?.run();
                    dismissToast(item.id);
                  }}
                >
                  {item.action.label}
                </button>
              )}
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

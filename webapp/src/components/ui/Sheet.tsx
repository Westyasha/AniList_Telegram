import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, useDragControls, type PanInfo } from "motion/react";
import * as m from "motion/react-m";
import { X } from "lucide-react";
import { useBackHandler } from "@/lib/back";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { IconButton } from "./Button";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

let openCount = 0;

function lockScroll(): () => void {
  openCount += 1;
  document.documentElement.style.overflow = "hidden";
  return () => {
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.documentElement.style.overflow = "";
  };
}

export function Sheet({ open, onClose, title, children, footer, className, style }: SheetProps) {
  const t = useT();
  const controls = useDragControls();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useBackHandler(open, onClose);

  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const previous = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <m.div
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            style={style}
            className={cn(
              "relative flex max-h-[88dvh] w-full max-w-[560px] flex-col rounded-t-[22px] border-t border-line-strong bg-surface outline-none",
              className,
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 42 }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex cursor-grab touch-none flex-col items-center pt-2.5"
              onPointerDown={(event) => controls.start(event)}
            >
              <span className="h-1 w-10 rounded-full bg-white/15" aria-hidden />
              <div className="flex w-full items-center justify-between gap-2 py-1 pr-2 pl-5">
                <h2 id={titleId} className="min-w-0 truncate text-base font-bold">
                  {title}
                </h2>
                <IconButton label={t.common.close} onClick={onClose}>
                  <X className="size-5" />
                </IconButton>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
            {footer && (
              <div className="border-t border-line px-5 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 12px)" }}>
                {footer}
              </div>
            )}
            {!footer && <div style={{ height: "var(--safe-bottom)" }} />}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

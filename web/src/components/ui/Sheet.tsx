"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useBackHandler } from "@/lib/back";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { IconButton } from "./Button";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  label: string;
  leading?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, title, label, leading, footer, children }: SheetProps) {
  const t = useT();
  const [present, setPresent] = useState(open);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ start: number; offset: number } | null>(null);
  const closeRef = useRef(onClose);

  if (open && !present) setPresent(true);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useBackHandler(open, onClose);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previous;
      returnFocus?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!present || typeof document === "undefined") return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    drag.current = { start: event.clientY, offset: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !panel.current) return;
    const offset = Math.max(0, event.clientY - drag.current.start);
    drag.current.offset = offset;
    panel.current.style.transition = "none";
    panel.current.style.transform = `translateY(${offset}px)`;
  };

  const onPointerUp = () => {
    if (!drag.current || !panel.current) return;
    const { offset } = drag.current;
    drag.current = null;
    panel.current.style.transition = "";
    panel.current.style.transform = "";
    if (offset > 96) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/60 transition-opacity duration-220 starting:opacity-0", open ? "opacity-100" : "opacity-0")}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && !open) setPresent(false);
        }}
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-[560px] flex-col rounded-t-sheet border-t border-line bg-s1 outline-none transition-transform duration-220 starting:translate-y-full",
          open ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
      >
        <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} className="shrink-0 touch-none">
          <div className="flex justify-center pt-2">
            <span aria-hidden className="h-1 w-8 rounded-full bg-s3" />
          </div>
          <div className="flex min-h-14 items-center gap-3 pr-2 pl-4">
            {leading}
            <div className="min-w-0 flex-1 text-17 font-semibold text-fg">{title}</div>
            <IconButton icon={X} label={t.common.close} onClick={onClose} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-line px-4 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 12px)" }}>
            {footer}
          </div>
        ) : (
          <div aria-hidden style={{ height: "var(--safe-bottom)" }} />
        )}
      </div>
    </div>,
    document.body,
  );
}

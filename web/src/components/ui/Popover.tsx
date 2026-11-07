"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const GAP = 6;
const MARGIN = 12;

interface Position {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  above: boolean;
}

export function usePopover() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => {
    setOpen(false);
    anchorRef.current?.focus();
  }, []);
  return { open, setOpen, toggle, close, anchorRef };
}

interface PopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  align?: "start" | "end";
  matchWidth?: boolean;
  minWidth?: number;
  preferredHeight?: number;
  className?: string;
  children: ReactNode;
}

export function Popover({
  open,
  anchorRef,
  onClose,
  align = "start",
  matchWidth = false,
  minWidth = 200,
  preferredHeight = 320,
  className,
  children,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(Math.max(matchWidth ? rect.width : minWidth, minWidth), viewportWidth - MARGIN * 2);
    const below = viewportHeight - rect.bottom - GAP - MARGIN;
    const aboveSpace = rect.top - GAP - MARGIN;
    const above = below < Math.min(preferredHeight, 220) && aboveSpace > below;
    const maxHeight = Math.max(160, Math.min(preferredHeight, above ? aboveSpace : below));
    const rawLeft = align === "end" ? rect.right - width : rect.left;
    const left = Math.min(Math.max(MARGIN, rawLeft), viewportWidth - MARGIN - width);
    const top = above ? rect.top - GAP : rect.bottom + GAP;
    setPosition({ top, left, width, maxHeight, above });
  }, [align, anchorRef, matchWidth, minWidth, preferredHeight]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    const onMove = () => place();
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, onClose, place, anchorRef]);

  if (!open || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      className={cn(
        "popover glass fixed z-[60] overflow-hidden rounded-card border border-line-strong bg-s1 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.45)] animate-pop",
        position.above && "origin-bottom",
        className,
      )}
      style={{
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        top: position.above ? undefined : position.top,
        bottom: position.above ? window.innerHeight - position.top : undefined,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

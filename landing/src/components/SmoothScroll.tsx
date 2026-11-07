"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { MotionConfig } from "motion/react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -72 }, lerp: 0.11 });
    return () => lenis.destroy();
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

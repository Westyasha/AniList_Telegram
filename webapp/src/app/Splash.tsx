import * as m from "motion/react-m";
import { Logo } from "@/components/brand/Logo";

export function Splash() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg">
      <m.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-5"
      >
        <Logo size={72} />
        <div className="h-[3px] w-24 overflow-hidden rounded-full bg-surface-3">
          <m.div
            className="h-full w-1/2 rounded-full bg-primary"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </m.div>
    </div>
  );
}

export function PageFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Logo size={40} className="animate-pulse opacity-60" />
    </div>
  );
}

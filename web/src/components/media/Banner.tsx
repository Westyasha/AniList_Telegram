import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface BannerProps {
  src: string | null | undefined;
  height: number;
  preload?: boolean;
  dim?: boolean;
  className?: string;
  children?: ReactNode;
}

const BANNER_RATIO = 1900 / 400;

const FADE =
  "linear-gradient(to bottom, rgb(11 11 13 / 0.6) 0%, rgb(11 11 13 / 0) 28%, rgb(11 11 13 / 0) 42%, rgb(11 11 13 / 0.72) 78%, rgb(11 11 13) 100%)";

export function Banner({ src, height, preload = false, dim = false, className, children }: BannerProps) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-bg", className)} style={{ height: `calc(${height}px + var(--safe-top))` }}>
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={`${Math.ceil((height + 48) * BANNER_RATIO)}px`}
          quality={80}
          preload={preload}
          className={cn("object-cover", dim && "opacity-40")}
        />
      ) : null}
      <div aria-hidden className="absolute inset-0" style={{ background: FADE }} />
      {children}
    </div>
  );
}

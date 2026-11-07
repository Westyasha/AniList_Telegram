import type { ReactNode } from "react";
import { Image } from "@/components/ui/Image";
import { cn } from "@/lib/cn";

interface BannerProps {
  src: string | null | undefined;
  fallback?: string | null;
  color?: string | null;
  height?: number;
  children?: ReactNode;
  className?: string;
}

export function Banner({ src, fallback, color, height = 190, children, className }: BannerProps) {
  const image = src ?? fallback;
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ height: `calc(${height}px + var(--safe-top))` }}>
      {image ? (
        <Image
          src={image}
          alt=""
          color={color}
          eager
          className={cn("absolute inset-0", !src && "scale-125 blur-2xl")}
          imgClassName={!src ? "object-[center_30%]" : undefined}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb, 224 35 61) / 0.45), #111116 70%)" }} />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,8,11,0.55) 0%, rgba(8,8,11,0.1) 30%, rgba(8,8,11,0.55) 70%, #08080B 100%), linear-gradient(0deg, rgb(var(--accent-rgb, 224 35 61) / 0.18), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

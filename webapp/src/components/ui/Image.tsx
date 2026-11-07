import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

const POSITIONED = /(^|\s)(absolute|fixed|sticky)(\s|$)/;

interface ImageProps {
  src: string | null | undefined;
  alt: string;
  color?: string | null;
  placeholder?: string | null;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
  eager?: boolean;
}

export function Image({ src, alt, color, placeholder, className, imgClassName, style, eager = false }: ImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = Boolean(src) && loadedSrc === src;
  const failed = Boolean(src) && failedSrc === src;
  const background = color ? `color-mix(in srgb, ${color} 38%, #111116)` : "#17171e";

  return (
    <div className={cn(!POSITIONED.test(className ?? "") && "relative", "overflow-hidden", className)} style={{ background, ...style }}>
      {placeholder && !loaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 size-full scale-110 object-cover blur-md"
        />
      )}
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}

export function Avatar({ src, alt, size = 40, className }: { src: string | null | undefined; alt: string; size?: number; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      className={cn("shrink-0 rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
}

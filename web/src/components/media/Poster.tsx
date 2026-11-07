import Image from "next/image";
import { cn } from "@/lib/cn";

type Chamfer = "lg" | "sm" | "none";

const CHAMFER: Record<Chamfer, string> = {
  lg: "chamfer",
  sm: "chamfer-sm",
  none: "",
};

interface PosterProps {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  chamfer?: Chamfer;
  preload?: boolean;
  className?: string;
  ratio?: "poster" | "square";
}

export function Poster({ src, alt, sizes, chamfer = "lg", preload = false, className, ratio = "poster" }: PosterProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-poster bg-s2", ratio === "poster" ? "aspect-[2/3]" : "aspect-square", CHAMFER[chamfer], className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={80}
          preload={preload}
          className="object-cover"
          draggable={false}
        />
      ) : null}
    </div>
  );
}

export function Avatar({ src, alt, size, className, preload = false }: { src: string | null | undefined; alt: string; size: number; className?: string; preload?: boolean }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full bg-s2", className)} style={{ width: size, height: size }}>
      {src ? <Image src={src} alt={alt} fill sizes={`${size}px`} quality={80} preload={preload} className="object-cover" /> : null}
    </div>
  );
}

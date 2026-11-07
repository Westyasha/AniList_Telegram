import Image from "next/image";
import type { Cover as CoverData } from "@/lib/site";

export function Cover({ cover, width, className, cut = 10 }: { cover: CoverData; width: number; className?: string; cut?: number }) {
  return (
    <div
      className={`facet relative aspect-[2/3] overflow-hidden ${className ?? ""}`}
      style={{ background: cover.color, ["--cut" as string]: `${cut}px` }}
    >
      <Image src={cover.image} alt="" width={width} height={Math.round(width * 1.5)} loading="lazy" className="absolute inset-0 size-full object-cover" />
    </div>
  );
}

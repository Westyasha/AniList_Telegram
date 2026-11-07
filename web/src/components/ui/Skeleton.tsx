import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cn("animate-rest bg-s2", className)} style={style} />;
}

export function PosterSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-2", className)}>
      <Skeleton className="chamfer aspect-[2/3] w-full rounded-poster" />
      <Skeleton className="h-3 w-4/5 rounded-[2px]" />
      <Skeleton className="h-3 w-1/2 rounded-[2px]" />
    </div>
  );
}

export function RowsSkeleton({ count = 6, height = 88 }: { count?: number; height?: number }) {
  return (
    <div aria-busy className="flex flex-col px-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line" style={{ height }}>
          <Skeleton className="chamfer-sm h-[64px] w-[44px] shrink-0 rounded-poster" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-3/4 rounded-[2px]" />
            <Skeleton className="h-3 w-1/3 rounded-[2px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div aria-busy className="grid grid-cols-3 gap-x-3 gap-y-5 px-4 sm:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <PosterSkeleton key={index} />
      ))}
    </div>
  );
}

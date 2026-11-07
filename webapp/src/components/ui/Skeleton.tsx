import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cn("skeleton rounded-lg", className)} style={style} />;
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden>
      <Skeleton className="aspect-[2/3] w-full rounded-[var(--radius-card)]" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function RowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="scroll-row" aria-busy>
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} className="w-[118px]" />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-5 px-4 sm:grid-cols-4" aria-busy>
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 px-4" aria-busy>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex gap-3 rounded-xl bg-surface p-2">
          <Skeleton className="h-[84px] w-[60px] rounded-md" />
          <div className="flex flex-1 flex-col justify-center gap-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

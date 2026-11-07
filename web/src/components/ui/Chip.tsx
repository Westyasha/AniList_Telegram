import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const BASE = "hit inline-flex h-8 shrink-0 items-center gap-2 rounded-chip px-3 text-13 transition-colors duration-120";

export function LinkChip({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn(BASE, "bg-s2 text-fg2 hover:bg-s3 hover:text-fg", className)}>
      {children}
    </Link>
  );
}

export function ToggleChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(BASE, selected ? "bg-fg font-medium text-bg" : "bg-s2 text-fg2 hover:bg-s3 hover:text-fg")}
    >
      {children}
    </button>
  );
}

export function TextChip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-8 items-center gap-2 rounded-chip bg-s2 px-3 text-13 text-fg2", className)}>{children}</span>;
}

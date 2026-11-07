import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Definition = [string, ReactNode];

export function DefinitionList({ rows, className }: { rows: Definition[]; className?: string }) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== false);
  if (visible.length === 0) return null;
  return (
    <dl className={cn("border-t border-line", className)}>
      {visible.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-b border-line py-3">
          <dt className="text-13 text-fg3">{label}</dt>
          <dd className="min-w-0 text-13 break-words text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

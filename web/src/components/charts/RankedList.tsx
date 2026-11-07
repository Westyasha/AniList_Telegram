import type { ReactNode } from "react";

export interface RankedItem {
  key: string;
  label: ReactNode;
  value: number;
  display: string;
  detail?: string;
}

export function RankedList({ items }: { items: RankedItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ol className="border-t border-line">
      {items.map((item, index) => (
        <li key={item.key} className="grid h-14 grid-cols-[24px_minmax(0,1fr)_auto] content-center items-baseline gap-x-3 border-b border-line">
          <span className="figure text-13 text-fg3">{index + 1}</span>
          <span className="truncate text-15 text-fg">{item.label}</span>
          <span className="figure text-13 text-fg2">
            {item.display}
            {item.detail ? <span className="ml-3 text-fg3">{item.detail}</span> : null}
          </span>
          <span aria-hidden className="col-start-2 col-end-4 mt-2 block h-0.5 bg-s2">
            <span className="block h-full bg-fg/40" style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

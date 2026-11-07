import { cn } from "@/lib/cn";

export interface Datum {
  key: string;
  label: string;
  value: number;
  color?: string;
}

const SCORE_HUES = ["#F43F5E", "#F2545B", "#F06A4E", "#F08B3E", "#F59E0B", "#D8B226", "#B4C33A", "#8DCF4C", "#68D85C", "#4ADE80"];

export function scoreColor(index: number, total: number): string {
  const position = total <= 1 ? SCORE_HUES.length - 1 : Math.round((index / (total - 1)) * (SCORE_HUES.length - 1));
  return SCORE_HUES[position];
}

export function ColumnChart({ data, height = 120, formatValue, className }: {
  data: Datum[];
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex items-end gap-1.5", className)} role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
      {data.map((d) => {
        const ratio = d.value / max;
        return (
          <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="tabular text-[10px] font-semibold text-faint">{d.value > 0 ? (formatValue ? formatValue(d.value) : d.value) : ""}</span>
            <div className="flex w-full items-end" style={{ height }}>
              <div
                className="w-full rounded-t-[4px] rounded-b-[2px] transition-[height] duration-700 ease-[var(--ease-out-soft)]"
                style={{ height: `${Math.max(d.value > 0 ? 3 : 1.5, ratio * 100)}%`, background: d.color ?? "var(--accent-text)", opacity: d.value > 0 ? 1 : 0.25 }}
              />
            </div>
            <span className="tabular truncate text-[10.5px] font-semibold text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BarList({ data, formatValue, className }: { data: Datum[]; formatValue?: (d: Datum) => string; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {data.map((d) => (
        <li key={d.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="truncate font-semibold">{d.label}</span>
            <span className="tabular shrink-0 text-[11.5px] font-semibold text-muted">{formatValue ? formatValue(d) : d.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-soft)]"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? "var(--accent-text)" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StackedBar({ data, formatValue, className }: { data: Datum[]; formatValue?: (value: number) => string; className?: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <div key={d.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: d.value, background: d.color }} />
          ))}
      </div>
      <Legend data={data} total={total} formatValue={formatValue} />
    </div>
  );
}

function Legend({ data, total, formatValue }: { data: Datum[]; total: number; formatValue?: (value: number) => string }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-2 min-[480px]:grid-cols-2">
      {data.map((d) => (
        <li key={d.key} className="flex min-w-0 items-center gap-2 text-[12px]">
          <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
          <span className="min-w-0 flex-1 truncate font-semibold text-muted">{d.label}</span>
          <span className="tabular shrink-0 font-semibold">{formatValue ? formatValue(d.value) : d.value}</span>
          <span className="tabular w-9 shrink-0 text-right text-[11px] text-faint">{Math.round((d.value / total) * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

export function Donut({ data, size = 132, thickness = 14, centerLabel, centerValue }: {
  data: Datum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = data.filter((d) => d.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-3)" strokeWidth={thickness} />
          {data
            .filter((d) => d.value > 0)
            .map((d) => {
              const length = (d.value / total) * circumference;
              const dash = Math.max(0.5, length - gap);
              const element = (
                <circle
                  key={d.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += length;
              return element;
            })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <span className="tabular text-xl font-extrabold">{centerValue}</span>}
            {centerLabel && <span className="text-[10.5px] font-semibold text-faint">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {data.map((d) => (
          <li key={d.key} className="flex min-w-0 items-center gap-2 text-[12px]">
            <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-semibold text-muted">{d.label}</span>
            <span className="tabular shrink-0 font-semibold">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

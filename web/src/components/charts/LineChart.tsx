"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/cn";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  area?: boolean;
  dashed?: boolean;
}

interface LineChartProps {
  times: number[];
  series: LineSeries[];
  format: (value: number) => string;
  formatTime: (unix: number) => string;
  label: string;
  height?: number;
  max?: number;
  className?: string;
}

const PAD_TOP = 6;
const PAD_BOTTOM = 2;

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    setWidth(Math.round(node.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
  let path = `M${points[0][0]},${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[Math.max(0, index - 1)];
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    const [x3, y3] = points[Math.min(points.length - 1, index + 2)];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    const low = Math.max(y1, y2);
    const high = Math.min(y1, y2);
    path += ` C${c1x.toFixed(1)},${Math.min(low, Math.max(high, c1y)).toFixed(1)} ${c2x.toFixed(1)},${Math.min(low, Math.max(high, c2y)).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return path;
}

function segments(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): [number, number][][] {
  const result: [number, number][][] = [];
  let current: [number, number][] = [];
  values.forEach((value, index) => {
    if (value === null || Number.isNaN(value)) {
      if (current.length) result.push(current);
      current = [];
      return;
    }
    current.push([x(index), y(value)]);
  });
  if (current.length) result.push(current);
  return result;
}

export function LineChart({ times, series, format, formatTime, label, height = 140, max, className }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();
  const count = times.length;

  const top = useMemo(() => {
    const peak = Math.max(0, ...series.flatMap((item) => item.values.filter((value): value is number => value !== null)));
    return max ?? niceCeil(peak * 1.1);
  }, [series, max]);

  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const x = (index: number) => (count <= 1 ? width / 2 : (index / (count - 1)) * width);
  const y = (value: number) => PAD_TOP + plotHeight - (Math.min(value, top) / top) * plotHeight;
  const active = hover ?? count - 1;

  const readout: ReactNode = series.map((item) => {
    const value = item.values[active];
    return (
      <span key={item.key} className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full" style={{ background: item.color }} />
        <span className="text-fg3">{item.label}</span>
        <span className="figure text-fg">{value === null || value === undefined ? "—" : format(value)}</span>
      </span>
    );
  });

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (count === 0 || width === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))));
  };

  const summary = series
    .map((item) => {
      const last = [...item.values].reverse().find((value) => value !== null);
      return `${item.label}: ${last === undefined || last === null ? "—" : format(last)}`;
    })
    .join(", ");

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <figcaption className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-13">
        {readout}
        <span className="figure ml-auto text-12 text-fg3">{count ? formatTime(times[active]) : ""}</span>
      </figcaption>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 ? (
          <svg
            role="img"
            aria-label={`${label}. ${summary}`}
            width={width}
            height={height}
            className="block touch-pan-y overflow-visible select-none"
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              {series.map((item) => (
                <linearGradient key={item.key} id={`${gradientId}-${item.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {[0, 0.5, 1].map((ratio) => (
              <line
                key={ratio}
                x1={0}
                x2={width}
                y1={PAD_TOP + plotHeight * ratio}
                y2={PAD_TOP + plotHeight * ratio}
                stroke="var(--color-line)"
                strokeDasharray={ratio === 1 ? undefined : "2 4"}
              />
            ))}
            {series.map((item) =>
              segments(item.values, x, y).map((points, index) => {
                const line = smoothPath(points);
                const first = points[0];
                const last = points[points.length - 1];
                return (
                  <g key={`${item.key}-${index}`}>
                    {item.area && points.length > 1 ? (
                      <path
                        d={`${line} L${last[0]},${PAD_TOP + plotHeight} L${first[0]},${PAD_TOP + plotHeight} Z`}
                        fill={`url(#${gradientId}-${item.key})`}
                      />
                    ) : null}
                    <path
                      d={line}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={item.area ? 2 : 1.5}
                      strokeDasharray={item.dashed ? "4 4" : undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              }),
            )}
            {count ? (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD_TOP}
                  y2={PAD_TOP + plotHeight}
                  stroke="var(--color-line-strong)"
                  opacity={hover === null ? 0 : 1}
                />
                {series.map((item) => {
                  const value = item.values[active];
                  if (value === null || value === undefined) return null;
                  return (
                    <circle
                      key={item.key}
                      cx={x(active)}
                      cy={y(value)}
                      r={3.5}
                      fill={item.color}
                      stroke="var(--color-bg)"
                      strokeWidth={2}
                    />
                  );
                })}
              </g>
            ) : null}
          </svg>
        ) : null}
        <span className="figure pointer-events-none absolute top-0 right-0 -translate-y-1/2 bg-bg pl-1 text-[11px] text-fg3">
          {format(top)}
        </span>
      </div>
      <div aria-hidden className="figure flex justify-between text-[11px] text-fg3">
        {count ? (
          <>
            <span>{formatTime(times[0])}</span>
            <span>{formatTime(times[Math.floor((count - 1) / 2)])}</span>
            <span>{formatTime(times[count - 1])}</span>
          </>
        ) : null}
      </div>
    </figure>
  );
}

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  dot?: string;
  count?: number;
  icon?: ReactNode;
}

export function Chip({ selected, dot, count, icon, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150",
        selected
          ? "border-transparent bg-fg text-bg"
          : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
        className,
      )}
      {...rest}
    >
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} aria-hidden />}
      {icon}
      {children}
      {count !== undefined && (
        <span className={cn("tabular text-[11px] font-semibold", selected ? "text-bg/60" : "text-faint")}>{count}</span>
      )}
    </button>
  );
}

export interface TagProps {
  children: ReactNode;
  tone?: "neutral" | "accent";
  className?: string;
  style?: CSSProperties;
}

export function Tag({ children, tone = "neutral", className, style }: TagProps) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold",
        tone === "accent" ? "bg-[var(--accent-soft)] text-[var(--accent-text)]" : "bg-surface-3 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

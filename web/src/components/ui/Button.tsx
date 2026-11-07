"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "quiet";

const VARIANTS: Record<Variant, string> = {
  primary: "chamfer-btn bg-accent font-semibold text-white hover:bg-accent-press disabled:bg-s3 disabled:text-fg3",
  secondary: "border border-line bg-s2 font-medium text-fg hover:bg-s3 disabled:text-fg3",
  ghost: "font-medium text-fg2 hover:bg-s2 hover:text-fg disabled:text-fg3",
  quiet: "font-medium text-fg2 hover:text-fg disabled:text-fg3",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  busy?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
}

export function Button({ variant = "secondary", block = false, busy = false, icon, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-control px-4 text-15 transition-[transform,background-color,color] duration-120 pressed:scale-[0.98]",
        VARIANTS[variant],
        block && "w-full",
        busy && "opacity-70",
        className,
      )}
      {...rest}
    >
      {icon ? <Icon icon={icon} /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  label: string;
  outline?: boolean;
  filled?: boolean;
  pressedState?: boolean;
}

export function IconButton({ icon, label, outline = false, filled = false, pressedState, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressedState}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg2 transition-[transform,background-color,color] duration-120 hover:bg-s2 hover:text-fg pressed:scale-[0.98] disabled:text-fg3 disabled:hover:bg-transparent",
        outline && "border border-line bg-s1",
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} filled={filled} />
    </button>
  );
}

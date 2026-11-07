import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-deep shadow-[0_6px_20px_-8px_rgba(224,35,61,0.65)]",
  secondary: "bg-surface-3 text-fg hover:bg-[#262631] border border-line",
  ghost: "bg-transparent text-muted hover:text-fg hover:bg-white/5",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-text)] hover:brightness-125",
  danger: "bg-dropped/12 text-dropped hover:bg-dropped/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, icon, block, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-[background,color,transform,filter] duration-150 active:scale-[0.98] disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  tone?: "plain" | "glass";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active, tone = "plain", className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-[background,color,transform] duration-150 active:scale-95",
        tone === "glass" ? "bg-black/45 text-white backdrop-blur-md hover:bg-black/60" : "text-muted hover:bg-white/6 hover:text-fg",
        active && "text-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

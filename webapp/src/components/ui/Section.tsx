import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";

interface SectionProps {
  title: ReactNode;
  to?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}

export function Section({ title, to, action, children, className, bleed = false }: SectionProps) {
  const t = useT();
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex min-h-9 items-center justify-between gap-3 px-4">
        <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">{title}</h2>
        {to ? (
          <Link
            to={to}
            className="-mr-2 inline-flex h-9 items-center gap-0.5 rounded-lg px-2 text-xs font-semibold text-muted hover:text-fg"
          >
            {t.common.seeAll}
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          action
        )}
      </div>
      <div className={cn(!bleed && "px-4")}>{children}</div>
    </section>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-surface p-4", className)}>{children}</div>;
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold text-faint">{label}</dt>
      <dd className="text-[13px] font-semibold text-fg">{children}</dd>
    </div>
  );
}

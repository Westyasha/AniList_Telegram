import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

interface SectionProps {
  title: ReactNode;
  aside?: ReactNode;
  href?: string;
  hrefLabel?: string;
  action?: ReactNode;
  bleed?: boolean;
  className?: string;
  children: ReactNode;
}

export function Section({ title, aside, href, hrefLabel, action, bleed = false, className, children }: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <header className="flex min-h-11 items-center gap-3 px-4">
        <h2 className="min-w-0 shrink-0 truncate text-17 font-semibold text-fg">{title}</h2>
        {aside ? <span className="min-w-0 truncate text-13 text-fg3">{aside}</span> : null}
        <span className="ml-auto flex shrink-0 items-center">
          {action}
          {href ? (
            <Link
              href={href}
              className="-mr-2 inline-flex h-11 items-center gap-1 rounded-control pr-1 pl-3 text-13 text-fg2 transition-colors hover:text-fg"
            >
              {hrefLabel}
              <Icon icon={ChevronRight} />
            </Link>
          ) : null}
        </span>
      </header>
      <div className={bleed ? undefined : "px-4"}>{children}</div>
    </section>
  );
}

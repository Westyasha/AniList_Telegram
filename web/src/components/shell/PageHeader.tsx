"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, ChevronLeft, Settings } from "lucide-react";
import { useViewer } from "@/api/session";
import { useT } from "@/lib/i18n";
import { useGoBack, useIsRoot } from "@/lib/navigation";
import { isTelegram } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/Button";

export function PageHeader({ title, actions, className }: { title?: ReactNode; actions?: ReactNode; className?: string }) {
  const isRoot = useIsRoot();
  const showBack = !isRoot && !isTelegram();
  return (
    <header className={cn("pt-safe", className)}>
      <div className="flex min-h-16 items-center gap-1 px-4 pt-2">
        {showBack ? <BackButton className="-ml-3" /> : null}
        {typeof title === "string" ? <h1 className="min-w-0 truncate text-24 font-semibold text-fg">{title}</h1> : title}
        {actions ? <div className="-mr-3 ml-auto flex items-center">{actions}</div> : null}
      </div>
    </header>
  );
}

export function BackButton({ className, overlay = false }: { className?: string; overlay?: boolean }) {
  const t = useT();
  const goBack = useGoBack();
  return <IconButton icon={ChevronLeft} label={t.common.back} onClick={goBack} className={cn(overlay && "bg-bg/80 text-fg hover:bg-bg", className)} />;
}

export function FloatingBack() {
  if (isTelegram()) return null;
  return (
    <div className="absolute left-2 z-20" style={{ top: "calc(var(--safe-top) + 8px)" }}>
      <BackButton overlay />
    </div>
  );
}

export function HeaderActions({ className }: { className?: string }) {
  const t = useT();
  const unread = useViewer()?.unread_notifications ?? 0;
  const link = "relative inline-flex size-11 items-center justify-center rounded-control text-fg2 transition-colors duration-120 hover:bg-s2 hover:text-fg";
  return (
    <div className={cn("flex items-center", className)}>
      <Link href="/notifications" aria-label={t.common.notifications} title={t.common.notifications} className={link}>
        <Icon icon={Bell} />
        {unread > 0 ? <span aria-hidden className="absolute top-3 right-3 size-1.5 rounded-full bg-accent" /> : null}
      </Link>
      <Link href="/settings" aria-label={t.common.settings} title={t.common.settings} className={link}>
        <Icon icon={Settings} />
      </Link>
    </div>
  );
}

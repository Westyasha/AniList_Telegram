import type { ReactNode } from "react";
import { Link } from "react-router";
import { Bell, Settings } from "lucide-react";
import { useSession } from "@/api/session";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({ title, leading, actions, className, sticky = true }: PageHeaderProps) {
  return (
    <header
      className={cn("z-30 bg-bg/85 backdrop-blur-xl", sticky && "sticky top-0", className)}
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        {leading}
        {title && <h1 className="min-w-0 flex-1 truncate text-[19px] font-extrabold tracking-[-0.02em]">{title}</h1>}
        {!title && <div className="flex-1" />}
        <div className="-mr-2 flex items-center">{actions}</div>
      </div>
    </header>
  );
}

export function HeaderActions({ showSettings = true }: { showSettings?: boolean }) {
  const t = useT();
  const session = useSession();
  const unread = session.anilist?.unread_notifications ?? 0;
  return (
    <>
      {session.anilist && (
        <Link
          to="/notifications"
          aria-label={t.common.notifications}
          className="relative inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-white/6 hover:text-fg"
        >
          <Bell className="size-[21px]" />
          {unread > 0 && (
            <span className="tabular absolute top-1.5 right-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-bg">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      )}
      {showSettings && (
        <Link
          to="/settings"
          aria-label={t.common.settings}
          className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-white/6 hover:text-fg"
        >
          <Settings className="size-[21px]" />
        </Link>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleUser, House, LibraryBig, Search, type LucideIcon } from "lucide-react";
import { useViewer } from "@/api/session";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Facet } from "@/components/brand/Mark";

interface TabDef {
  href: string;
  icon: LucideIcon;
  label: "home" | "search" | "schedule" | "library" | "profile";
  match: (pathname: string) => boolean;
}

const TABS: TabDef[] = [
  { href: "/", icon: House, label: "home", match: (p) => p === "/" },
  { href: "/search", icon: Search, label: "search", match: (p) => p.startsWith("/search") },
  { href: "/schedule", icon: CalendarDays, label: "schedule", match: (p) => p.startsWith("/schedule") },
  { href: "/library", icon: LibraryBig, label: "library", match: (p) => p.startsWith("/library") },
  { href: "/me", icon: CircleUser, label: "profile", match: (p) => p === "/me" || p.startsWith("/settings") || p.startsWith("/notifications") },
];

export function TabBar() {
  const t = useT();
  const pathname = usePathname();
  const unread = useViewer()?.unread_notifications ?? 0;

  return (
    <nav
      aria-label={t.tabs.home}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg"
      style={{ paddingBottom: "var(--safe-bottom)", paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}
    >
      <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-[560px]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  if (active && pathname === tab.href) {
                    event.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                  }
                  haptic.selection();
                }}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-12 transition-colors duration-120",
                  active ? "text-fg" : "text-fg3 hover:text-fg2",
                )}
              >
                <span aria-hidden className={cn("absolute top-0 transition-opacity duration-120", active ? "opacity-100" : "opacity-0")}>
                  <Facet direction="down" />
                </span>
                <span className="relative">
                  <Icon icon={tab.icon} />
                  {tab.label === "profile" && unread > 0 ? <span className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-accent" /> : null}
                </span>
                {t.tabs[tab.label]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

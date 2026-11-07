import { useLocation, useNavigate } from "react-router";
import { CalendarDays, CircleUserRound, House, LibraryBig, Search, type LucideIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";

interface TabDef {
  path: string;
  icon: LucideIcon;
  label: "home" | "search" | "schedule" | "library" | "profile";
  match: (pathname: string) => boolean;
}

export const TABS: TabDef[] = [
  { path: "/", icon: House, label: "home", match: (p) => p === "/" },
  { path: "/search", icon: Search, label: "search", match: (p) => p.startsWith("/search") },
  { path: "/schedule", icon: CalendarDays, label: "schedule", match: (p) => p.startsWith("/schedule") },
  { path: "/library", icon: LibraryBig, label: "library", match: (p) => p.startsWith("/library") },
  {
    path: "/me",
    icon: CircleUserRound,
    label: "profile",
    match: (p) => p === "/me" || p.startsWith("/settings") || p.startsWith("/notifications"),
  },
];

export const ROOT_PATHS = new Set(TABS.map((tab) => tab.path));

export function TabBar() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/88 backdrop-blur-xl"
      style={{ paddingBottom: "var(--safe-bottom)", paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}
    >
      <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-[560px] items-stretch">
        {TABS.map((tab) => {
          const active = tab.match(location.pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.path} className="flex-1">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (active && location.pathname === tab.path) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                  }
                  haptic.selection();
                  navigate(tab.path);
                }}
                className={cn(
                  "relative flex h-full w-full flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors",
                  active ? "text-fg" : "text-faint hover:text-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0 h-[2px] w-8 rounded-full bg-primary transition-opacity duration-200",
                    active ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <Icon className={cn("size-[22px] transition-transform duration-200", active && "text-primary")} strokeWidth={active ? 2.2 : 1.8} />
                {t.tabs[tab.label]}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

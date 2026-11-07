import { Suspense } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import * as m from "motion/react-m";
import { ChevronLeft } from "lucide-react";
import { isTelegram } from "@/lib/telegram";
import { useT } from "@/lib/i18n";
import { Toaster } from "@/components/ui/Toaster";
import { IconButton } from "@/components/ui/Button";
import { ListEditorHost } from "@/components/media/ListEditor";
import { LoginSheetHost } from "@/components/auth/LoginGate";
import { TabBar } from "./TabBar";
import { PageFallback } from "./Splash";
import { useDeepLink, useGoBack, useIsRoot, useTelegramBackButton } from "./navigation";

function BrowserBackButton() {
  const t = useT();
  const isRoot = useIsRoot();
  const goBack = useGoBack();
  if (isRoot || isTelegram()) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-30 mx-auto max-w-[560px] px-3" style={{ top: "calc(var(--safe-top) + 10px)" }}>
      <IconButton label={t.common.back} tone="glass" onClick={goBack} className="pointer-events-auto">
        <ChevronLeft className="size-5" />
      </IconButton>
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  useDeepLink();
  useTelegramBackButton();

  return (
    <div className="relative mx-auto min-h-dvh max-w-[560px]" style={{ paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}>
      <ScrollRestoration />
      <BrowserBackButton />
      <m.main
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="pb-app"
      >
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </m.main>
      <TabBar />
      <ListEditorHost />
      <LoginSheetHost />
      <Toaster />
    </div>
  );
}

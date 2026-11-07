"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useMounted } from "@/lib/hooks";
import { useNavigationTrail, useTelegramBackButton } from "@/lib/navigation";
import { setupTelegram } from "@/lib/telegram";
import { ListIndexProvider } from "@/components/media/ListIndex";
import { ListEditorHost } from "@/components/media/ListEditor";
import { LoginSheetHost } from "./LoginGate";
import { TabBar } from "./TabBar";

function Chrome() {
  useNavigationTrail();
  useTelegramBackButton();
  return null;
}

function Page({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <main key={pathname} className="pb-app animate-enter">
      {children}
    </main>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();

  useEffect(() => {
    setupTelegram();
  }, []);

  if (!mounted) return <div className="min-h-dvh bg-bg" />;

  return (
    <ListIndexProvider>
      <div className="relative mx-auto min-h-dvh max-w-[560px]" style={{ paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}>
        <Suspense fallback={null}>
          <Chrome />
          <Page>{children}</Page>
        </Suspense>
        <TabBar />
        <ListEditorHost />
        <LoginSheetHost />
      </div>
    </ListIndexProvider>
  );
}

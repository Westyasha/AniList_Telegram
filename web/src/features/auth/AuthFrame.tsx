import type { ReactNode } from "react";
import { Mark } from "@/components/brand/Mark";

export function AuthFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 sm:px-8">
      <header className="mx-auto flex h-20 w-full max-w-[680px] items-center gap-3">
        <Mark size={28} />
        <span className="text-17 font-semibold text-fg">AniList</span>
        <span className="text-13 text-fg3">for Telegram</span>
      </header>
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col justify-center pb-24 animate-enter">{children}</main>
      {footer ? <footer className="mx-auto w-full max-w-[680px] pb-8 text-13 text-fg3">{footer}</footer> : null}
    </div>
  );
}

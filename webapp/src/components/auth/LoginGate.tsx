import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Bell, Check, LoaderCircle, RefreshCw, Tv } from "lucide-react";
import { closeLoginSheet, startLogin, stopLogin, useLoginState } from "@/api/auth";
import { useT } from "@/lib/i18n";
import { isTelegram } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Logo } from "@/components/brand/Logo";

const BENEFIT_ICONS = [Tv, RefreshCw, Bell, BarChart3];

export function LoginButton({ className }: { className?: string }) {
  const t = useT();
  const client = useQueryClient();
  const { phase } = useLoginState();

  if (phase === "waiting") {
    return (
      <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-center", className)}>
        <div className="flex items-center gap-2 text-sm font-bold">
          <LoaderCircle className="size-4 animate-spin text-primary" />
          {t.auth.waiting}
        </div>
        <p className="text-xs text-muted">{t.auth.waitingBody}</p>
        <Button size="sm" variant="ghost" onClick={stopLogin}>
          {t.auth.stop}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      size="lg"
      block
      className={className}
      loading={phase === "starting"}
      onClick={() => void startLogin(client, t)}
      icon={<Logo size={20} className="rounded-sm" />}
    >
      {t.auth.cta}
    </Button>
  );
}

export function LoginGate({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useT();
  return (
    <div className={cn("flex flex-col", compact ? "gap-4 py-2" : "gap-6 px-5 py-8", className)}>
      <div className={cn("flex flex-col items-center text-center", compact ? "gap-2" : "gap-3")}>
        <div className="relative">
          <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/15 blur-2xl" aria-hidden />
          <Logo size={compact ? 52 : 68} />
        </div>
        <h2 className={cn("font-extrabold tracking-[-0.02em]", compact ? "text-lg" : "text-[22px]")}>{t.auth.title}</h2>
        <p className="max-w-[300px] text-[13px] text-muted">{t.auth.body}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {t.auth.benefits.map((benefit, index) => {
          const Icon = BENEFIT_ICONS[index] ?? Check;
          return (
            <li key={benefit} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary-hover">
                <Icon className="size-4" />
              </span>
              <span className="text-[13px] font-semibold">{benefit}</span>
            </li>
          );
        })}
      </ul>
      <LoginButton />
      {!isTelegram() && <p className="text-center text-xs text-faint">{t.auth.telegramOnly}</p>}
    </div>
  );
}

export function LoginSheetHost() {
  const { sheetOpen } = useLoginState();
  return (
    <Sheet open={sheetOpen} onClose={closeLoginSheet}>
      <LoginGate compact />
    </Sheet>
  );
}

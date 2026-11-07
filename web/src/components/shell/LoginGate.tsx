"use client";

import { useQueryClient } from "@tanstack/react-query";
import { closeLoginSheet, startLogin, stopLogin, useLoginState } from "@/api/auth";
import { useT } from "@/lib/i18n";
import { isTelegram } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Mark } from "@/components/brand/Mark";

export function LoginGate({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useT();
  const client = useQueryClient();
  const { phase } = useLoginState();
  const inTelegram = isTelegram();

  return (
    <div className={cn("flex flex-col items-start gap-4", compact ? "py-2" : "px-4 py-8", className)}>
      {!compact ? <Mark size={40} /> : null}
      <div className="flex flex-col gap-1">
        <h2 className="text-20 font-semibold text-fg">{phase === "waiting" ? t.auth.waiting : t.auth.title}</h2>
        <p className="text-15 text-fg2">{phase === "waiting" ? t.auth.waitingBody : t.auth.body}</p>
      </div>
      {phase === "waiting" ? (
        <Button variant="secondary" onClick={stopLogin}>
          {t.auth.stop}
        </Button>
      ) : (
        <Button variant="primary" busy={phase === "starting"} disabled={!inTelegram} onClick={() => void startLogin(client, t)}>
          {t.auth.cta}
        </Button>
      )}
      {!inTelegram ? <p className="text-13 text-fg3">{t.auth.telegramOnly}</p> : null}
    </div>
  );
}

export function LoginSheetHost() {
  const t = useT();
  const { sheetOpen } = useLoginState();
  return (
    <Sheet open={sheetOpen} onClose={closeLoginSheet} label={t.auth.title}>
      <LoginGate compact />
    </Sheet>
  );
}

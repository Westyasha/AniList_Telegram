"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { botLink, fetchBotUsername } from "@/api/pending";
import type { Lang } from "@/api/types";
import { dictionaries, detectLang } from "@/lib/i18n";
import { useMounted } from "@/lib/hooks";
import { AuthFrame } from "./AuthFrame";
import { Outcome, type OutcomeKind } from "./Outcome";

const KINDS = new Set<OutcomeKind>(["ok", "cancelled", "expired", "exchange", "rate"]);

function Result() {
  const params = useSearchParams();
  const status = params.get("status") as OutcomeKind | null;
  const kind: OutcomeKind = status && KINDS.has(status) ? status : "missing";
  const rawName = params.get("name");
  const name = rawName ? rawName.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 64) || null : null;
  const langParam = params.get("lang");
  const lang: Lang = langParam === "ru" || langParam === "en" ? langParam : detectLang();
  const [bot, setBot] = useState<string | null>(null);
  const t = dictionaries[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    let alive = true;
    void fetchBotUsername().then((value) => {
      if (alive) setBot(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AuthFrame>
      <Outcome kind={kind} name={name} t={t} botHref={botLink(bot)} />
    </AuthFrame>
  );
}

export function ResultScreen() {
  const mounted = useMounted();
  if (!mounted) return <div className="min-h-dvh bg-bg" />;
  return <Result />;
}

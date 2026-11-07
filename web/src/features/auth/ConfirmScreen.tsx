"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { botLink, fetchBotUsername, fetchPending, isToken, sendConfirm, type ConfirmAction, type PendingLogin } from "@/api/pending";
import type { Lang } from "@/api/types";
import { dictionaries, detectLang } from "@/lib/i18n";
import { useMounted } from "@/lib/hooks";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Figures } from "@/components/ui/Figures";
import { AuthFrame } from "./AuthFrame";
import { Outcome, type OutcomeKind } from "./Outcome";

interface Fragment {
  nonce: string;
  csrf: string;
}

function readFragment(): Fragment | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nonce = params.get("nonce");
  const csrf = params.get("csrf");
  return isToken(nonce) && isToken(csrf) ? { nonce, csrf } : null;
}

type View = { kind: "loading" } | { kind: "ready"; data: PendingLogin; deadline: number } | { kind: "outcome"; outcome: OutcomeKind; name: string | null };

function formatLeft(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function AccountPanel({ caption, name, detail, avatar, initial }: { caption: string; name: string; detail?: string | null; avatar?: string | null; initial: string }) {
  return (
    <div className="flex min-h-24 min-w-0 flex-1 items-center gap-4 rounded-card border border-line bg-s1 p-4">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-s3">
        {avatar ? (
          <Image src={avatar} alt="" fill sizes="48px" quality={80} className="object-cover" />
        ) : (
          <span aria-hidden className="flex size-full items-center justify-center text-17 font-medium text-fg2">
            {initial}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-12 text-fg3">{caption}</span>
        <span className="truncate text-17 font-medium text-fg">{name}</span>
        {detail ? <span className="truncate text-13 text-fg2">{detail}</span> : null}
      </div>
    </div>
  );
}

function Confirm() {
  const [fragment] = useState(readFragment);
  const [lang, setLang] = useState<Lang>(() => detectLang());
  const [view, setView] = useState<View>(() => (fragment ? { kind: "loading" } : { kind: "outcome", outcome: "missing", name: null }));
  const [busy, setBusy] = useState<ConfirmAction | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [bot, setBot] = useState<string | null>(null);
  const t = dictionaries[lang];

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    let alive = true;
    void fetchBotUsername().then((name) => {
      if (alive) setBot(name);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!fragment) return;
    const controller = new AbortController();
    fetchPending(fragment.nonce, controller.signal)
      .then((result) => {
        if (result.kind === "ok") {
          setLang(result.data.lang);
          setView({ kind: "ready", data: result.data, deadline: Date.now() + result.data.expires_in * 1000 });
        } else {
          setView({ kind: "outcome", outcome: result.kind === "network" ? "network" : result.kind, name: null });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [fragment]);

  const ready = view.kind === "ready";
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ready]);

  const left = view.kind === "ready" ? view.deadline - now : 0;
  const expired = view.kind === "ready" && left <= 0;

  const act = async (action: ConfirmAction) => {
    if (!fragment || busy) return;
    setBusy(action);
    const result = await sendConfirm(fragment.nonce, fragment.csrf, action);
    setBusy(null);
    if (result.status === "ok") setView({ kind: "outcome", outcome: "ok", name: result.name });
    else if (result.status === "cancelled") setView({ kind: "outcome", outcome: "cancelled", name: null });
    else setView({ kind: "outcome", outcome: result.reason, name: null });
  };

  const botHref = botLink(bot);

  if (view.kind === "outcome" || expired) {
    return (
      <AuthFrame>
        <Outcome kind={expired ? "expired" : view.kind === "outcome" ? view.outcome : "network"} name={view.kind === "outcome" ? view.name : null} t={t} botHref={botHref} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <section aria-busy={view.kind === "loading"} className="flex flex-col gap-8">
        <div className="flex max-w-[560px] flex-col gap-3">
          <h1 className="text-32 font-semibold text-fg">{t.confirm.title}</h1>
          <p className="text-17 text-fg2">{t.confirm.body}</p>
        </div>

        {view.kind === "loading" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-20 flex-1 rounded-card" />
            <Skeleton className="h-20 flex-1 rounded-card" />
            <span className="sr-only">{t.confirm.checking}</span>
          </div>
        ) : (
          <div className="flex flex-col items-stretch gap-3 sm:flex-row">
            <AccountPanel caption={t.confirm.anilist} name={view.data.anilist.name} avatar={view.data.anilist.avatar} initial={view.data.anilist.name.slice(0, 1).toUpperCase()} />
            <span className="flex items-center justify-center gap-2 text-13 text-fg3 sm:flex-col">
              <Icon icon={ArrowRight} className="rotate-90 sm:rotate-0" />
              <span className="sr-only">{t.confirm.linkTo}</span>
            </span>
            <AccountPanel
              caption={t.confirm.telegram}
              name={view.data.telegram.name}
              detail={view.data.telegram.username ? `@${view.data.telegram.username}` : null}
              initial={view.data.telegram.name.slice(0, 1).toUpperCase()}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={view.kind !== "ready"} busy={busy === "confirm"} onClick={() => void act("confirm")}>
            {t.confirm.confirm}
          </Button>
          <Button variant="ghost" disabled={view.kind !== "ready" || busy !== null} busy={busy === "cancel"} onClick={() => void act("cancel")}>
            {t.confirm.cancel}
          </Button>
          {view.kind === "ready" ? <Figures text={t.confirm.expires(formatLeft(left))} className="ml-auto text-13 text-fg3" /> : null}
        </div>
      </section>
    </AuthFrame>
  );
}

export function ConfirmScreen() {
  const mounted = useMounted();
  if (!mounted) return <div className="min-h-dvh bg-bg" />;
  return <Confirm />;
}

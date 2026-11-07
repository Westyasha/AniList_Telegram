"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useInView } from "motion/react";
import authConfirm from "@/assets/auth-confirm.jpg";
import { COPY } from "@/lib/copy";
import { BOT_HANDLE, searchHits, type Locale } from "@/lib/site";
import { Mark, SectionLabel } from "./brand";
import { Reveal } from "./Reveal";

const EASE = [0.2, 0.8, 0.2, 1] as const;

function useTicker(length: number, interval: number, active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % length), interval);
    return () => window.clearInterval(timer);
  }, [active, interval, length]);
  return index;
}

function Tile({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={`relative overflow-hidden rounded-panel bg-s1 p-6 shadow-[inset_0_0_0_1px_var(--color-line)] sm:p-8 ${className ?? ""}`}>
      {children}
    </Reveal>
  );
}

function TileText({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="title text-fg">{title}</h3>
      <p className="mt-2 max-w-[420px] text-[15px] leading-[22px] text-fg3">{body}</p>
    </div>
  );
}

function Face() {
  return (
    <svg viewBox="0 0 48 48" className="h-[0.8em] w-[0.8em]" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
      <circle cx="24" cy="24" r="20" />
      <path d="M15.5 28.5c4.5 5.5 12.5 5.5 17 0" />
      <path d="M17 19v1M31 19v1" strokeWidth="5" />
    </svg>
  );
}

function Stars() {
  return (
    <span className="flex gap-[0.08em] text-[0.62em]">
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} className={index < 4 ? "text-fg" : "text-s3"}>
          ★
        </span>
      ))}
    </span>
  );
}

const SCORES: ReactNode[] = ["80", "8.0", "8", <Stars key="stars" />, <Face key="face" />];

function ScoreTile({ t, active }: { t: (typeof COPY)["en"]["details"]["score"]; active: boolean }) {
  const index = useTicker(SCORES.length, 1900, active);
  return (
    <div className="flex h-full flex-col justify-between gap-10 sm:flex-row sm:items-end">
      <TileText title={t.title} body={t.body} />
      <div className="flex shrink-0 flex-col items-start sm:items-end">
        <div className="relative h-[96px] w-[220px] overflow-hidden text-[88px] font-semibold leading-none tracking-[-0.04em] text-fg sm:text-right">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={index}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="figure absolute inset-0 flex items-center sm:justify-end"
            >
              {SCORES[index]}
            </motion.span>
          </AnimatePresence>
        </div>
        <ul className="mt-4 flex flex-wrap gap-1.5 sm:justify-end">
          {t.formats.map((format, position) => (
            <li
              key={format}
              className={`rounded-chip px-2 py-1 text-[12px] transition-colors duration-300 ${position === index ? "bg-s3 text-fg" : "text-fg3"}`}
            >
              {format}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LangTile({ t, active, codes }: { t: (typeof COPY)["en"]["details"]["lang"]; active: boolean; codes: string[] }) {
  const tick = useTicker(t.pairs.length * 2, 1500, active);
  const pair = t.pairs[Math.floor(tick / 2)];
  const side = tick % 2;
  return (
    <div className="flex h-full flex-col justify-between gap-10">
      <TileText title={t.title} body={t.body} />
      <div>
        <div className="relative h-[44px] overflow-hidden text-[32px] font-semibold leading-[44px] tracking-[-0.02em] text-fg">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={tick}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute inset-0 truncate"
            >
              {pair[side]}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="figure relative mt-4 inline-flex rounded-control bg-s2 p-1 text-[12px]">
          <motion.span
            aria-hidden
            className="absolute inset-y-1 left-1 w-9 rounded-[6px] bg-s3"
            animate={{ x: side === 0 ? 0 : 36 }}
            transition={{ duration: 0.4, ease: EASE }}
          />
          {codes.map((code, position) => (
            <span key={code} className={`relative grid h-7 w-9 place-items-center transition-colors ${position === side ? "text-fg" : "text-fg3"}`}>
              {code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function InlineTile({ t, active }: { t: (typeof COPY)["en"]["details"]["inline"]; active: boolean }) {
  const query = `${BOT_HANDLE} frieren`;
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (!active || typed >= query.length) return;
    const timer = window.setTimeout(() => setTyped((value) => value + 1), typed === 0 ? 500 : 55);
    return () => window.clearTimeout(timer);
  }, [active, typed, query.length]);
  const done = typed >= query.length;
  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <TileText title={t.title} body={t.body} />
      <div className="rounded-card bg-tg p-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.05)]">
        <ul className="flex min-h-[188px] flex-col justify-end">
          {searchHits.slice(0, 3).map((hit, index) => (
            <motion.li
              key={hit.id}
              initial={false}
              animate={{ opacity: done ? 1 : 0, y: done ? 0 : 10 }}
              transition={{ duration: 0.4, ease: EASE, delay: done ? index * 0.09 : 0 }}
              className="flex items-center gap-3 rounded-control px-2 py-2"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-s3">
                <Mark size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] text-fg">{hit.title}</span>
                <span className="figure block text-[12px] text-fg3">
                  {[hit.format, hit.year, hit.score ? `★ ${(hit.score / 10).toFixed(1)}` : null].filter(Boolean).join(" · ")}
                </span>
              </span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-2 flex h-11 items-center rounded-[10px] bg-s2 px-3 text-[14px]">
          <span className="truncate text-fg">{query.slice(0, typed)}</span>
          <span className="caret ml-px h-4 w-px shrink-0 bg-accent-ink" />
          {typed === 0 ? <span className="text-fg3">{t.chat}</span> : null}
        </div>
      </div>
    </div>
  );
}

function LoginTile({ t }: { t: (typeof COPY)["en"]["details"]["login"] }) {
  return (
    <div className="grid h-full grid-cols-1 items-center gap-8 md:grid-cols-[0.8fr_1.2fr]">
      <TileText title={t.title} body={t.body} />
      <div className="overflow-hidden rounded-card bg-s2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8),inset_0_0_0_1px_var(--color-line)]">
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2.5">
          <span className="size-2 rounded-full bg-s3" />
          <span className="size-2 rounded-full bg-s3" />
          <span className="size-2 rounded-full bg-s3" />
          <span className="figure ml-3 truncate text-[11px] text-fg3">anilist.westyasha.online/auth/confirm</span>
        </div>
        <Image src={authConfirm} alt={t.alt} placeholder="blur" sizes="(min-width: 1024px) 520px, 90vw" className="block h-auto w-full" />
      </div>
    </div>
  );
}

export function Details({ locale }: { locale: Locale }) {
  const t = COPY[locale].details;
  const grid = useRef<HTMLDivElement>(null);
  const active = useInView(grid, { amount: 0.2 });

  return (
    <section id="details" className="relative py-28 sm:py-40">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <Reveal className="max-w-[720px]">
          <SectionLabel index={t.index} label={t.label} />
          <h2 className="headline mt-5 text-fg">{t.title}</h2>
        </Reveal>
        <div ref={grid} className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-6">
          <Tile className="lg:col-span-4">
            <ScoreTile t={t.score} active={active} />
          </Tile>
          <Tile className="lg:col-span-2" delay={0.08}>
            <LangTile t={t.lang} active={active} codes={locale === "ru" ? ["RU", "EN"] : ["EN", "RU"]} />
          </Tile>
          <Tile className="lg:col-span-2" delay={0.04}>
            <InlineTile t={t.inline} active={active} />
          </Tile>
          <Tile className="lg:col-span-4" delay={0.12}>
            <LoginTile t={t.login} />
          </Tile>
        </div>
      </div>
    </section>
  );
}

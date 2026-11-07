"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { COPY } from "@/lib/copy";
import { BOT_URL, GITHUB_URL, type Locale } from "@/lib/site";
import { GithubIcon, Mark } from "./brand";

export function Nav({ locale }: { locale: Locale }) {
  const t = COPY[locale].nav;
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setSolid(y > 24);
    setHidden(y > 640 && y > previous + 4 ? true : y < previous - 4 ? false : hidden);
  });

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const links: [string, string][] = [
    ["#bot", t.bot],
    ["#alerts", t.alerts],
    ["#app", t.app],
    ["#cards", t.cards],
    ["#source", t.source],
  ];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: hidden ? -80 : 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={`transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
          solid ? "bg-bg/72 shadow-[inset_0_-1px_0_var(--color-line)] backdrop-blur-xl backdrop-saturate-150" : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 sm:px-8">
          <a href={`${base}${locale === "ru" ? "/ru/" : "/"}`} className="flex items-center gap-2.5" aria-label="AniList for Telegram">
            <Mark size={26} />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
              AniList <span className="font-normal text-fg3">for Telegram</span>
            </span>
          </a>
          <ul className="ml-4 hidden items-center gap-1 lg:flex">
            {links.map(([href, label]) => (
              <li key={href}>
                <a href={href} className="rounded-control px-3 py-2 text-[14px] text-fg2 transition-colors hover:text-fg">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <a
              href={`${base}${locale === "ru" ? "/" : "/ru/"}`}
              aria-label={t.language}
              title={t.language}
              className="figure grid h-10 min-w-10 place-items-center rounded-control px-2 text-[13px] text-fg2 transition-colors hover:bg-s2 hover:text-fg"
            >
              {t.languageShort}
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t.github}
              className="grid size-10 place-items-center rounded-control text-fg2 transition-colors hover:bg-s2 hover:text-fg"
            >
              <GithubIcon />
            </a>
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="facet ml-1 hidden h-10 items-center bg-fg px-4 text-[14px] font-medium text-bg transition-colors [--cut:9px] hover:bg-white sm:inline-flex"
            >
              {t.open}
            </a>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}

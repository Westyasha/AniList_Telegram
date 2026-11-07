"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import home from "@/assets/app-home.jpg";
import { COPY } from "@/lib/copy";
import { aired, BOT_URL, covers, GITHUB_URL, type Locale } from "@/lib/site";
import { AlertMessage } from "./AlertMessage";
import { GithubIcon, PrimaryButton, SecondaryButton, TelegramIcon } from "./brand";
import { Cover } from "./Cover";
import { Phone } from "./Phone";

const EASE = [0.2, 0.8, 0.2, 1] as const;
const COLUMNS = 7;

function CoverWall() {
  const columns = Array.from({ length: COLUMNS }, (_, column) => covers.filter((_, index) => index % COLUMNS === column));
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden [perspective:1400px]">
      <div className="absolute left-1/2 top-1/2 flex w-[1900px] -translate-x-[38%] -translate-y-1/2 gap-5 [transform-style:preserve-3d] [transform:rotateX(22deg)_rotateZ(-14deg)]">
        {columns.map((items, column) => (
          <div key={column} className="h-[1500px] w-[220px] shrink-0 overflow-hidden">
            <div
              className="wall-column flex flex-col gap-5"
              style={{ ["--speed" as string]: `${70 + column * 9}s`, ["--dir" as string]: column % 2 ? "reverse" : "normal" }}
            >
              {[...items, ...items].map((cover, index) => (
                <Cover key={`${cover.id}-${index}`} cover={cover} width={220} cut={14} className="w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const wallY = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const wallOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const phoneRotate = useTransform(scrollYProgress, [0, 1], [0, -4]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-16 pt-28 lg:pb-24">
      <motion.div style={{ y: wallY, opacity: wallOpacity }} className="absolute inset-0 -z-10">
        <motion.div initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 0.85, scale: 1 }} transition={{ duration: 1.8, ease: EASE }} className="absolute inset-0">
          <CoverWall />
        </motion.div>
      </motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--color-bg)_0%,rgb(11_11_13/0.9)_32%,rgb(11_11_13/0.45)_62%,rgb(11_11_13/0.7)_100%)] max-lg:bg-[linear-gradient(180deg,rgb(11_11_13/0.75)_0%,rgb(11_11_13/0.9)_45%,rgb(11_11_13/0.55)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-[linear-gradient(to_top,var(--color-bg),transparent)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(to_bottom,var(--color-bg),transparent)]" />

      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-14 px-4 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        <motion.div style={{ y: textY }} className="max-w-[640px]">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="mb-6 flex items-center gap-2.5 text-[14px] text-fg2"
          >
            <span className="live size-1.5 rounded-full bg-good" />
            {t.hero.eyebrow}
          </motion.p>
          <h1 className="display text-fg">
            {t.hero.words.map((word, index) => (
              <span key={word} className="mr-[0.22em] inline-block overflow-hidden pb-[0.06em] align-bottom last:mr-0">
                <motion.span
                  className={`inline-block ${index === t.hero.words.length - 1 ? "text-fg" : ""}`}
                  initial={{ y: "105%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.15 + index * 0.08 }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
            className="lede mt-7 max-w-[540px]"
          >
            {t.hero.lede}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.68 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <PrimaryButton href={BOT_URL} icon={<TelegramIcon />}>
              {t.hero.primary}
            </PrimaryButton>
            <SecondaryButton href={GITHUB_URL} icon={<GithubIcon />}>
              {t.hero.secondary}
            </SecondaryButton>
          </motion.div>
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-fg3"
          >
            {t.hero.meta.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1 rotate-45 bg-fg3" />
                {item}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div style={{ y: phoneY, rotate: phoneRotate }} className="relative mx-auto w-[260px] sm:w-[300px] lg:mr-6 lg:w-[330px]">
          <motion.div initial={{ opacity: 0, y: 80, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 1.2, ease: EASE, delay: 0.25 }}>
            <Phone src={home} alt="Mini App home screen" priority />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -40, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 1.3 }}
            className="absolute -left-10 top-[58%] w-[290px] sm:-left-28 sm:w-[320px]"
          >
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <AlertMessage item={aired[0]} t={t.alert} />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

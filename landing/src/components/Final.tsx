"use client";

import { motion } from "motion/react";
import { COPY } from "@/lib/copy";
import { BOT_URL, covers, GITHUB_URL, type Locale } from "@/lib/site";
import { GithubIcon, Mark, PrimaryButton, TelegramIcon } from "./brand";
import { Cover } from "./Cover";

function Marquee({ reverse = false, offset = 0 }: { reverse?: boolean; offset?: number }) {
  const row = [...covers.slice(offset), ...covers.slice(0, offset)].slice(0, 14);
  return (
    <div className="flex overflow-hidden">
      <div
        className="marquee-track flex w-max shrink-0 gap-4 pr-4"
        style={{ ["--speed" as string]: reverse ? "110s" : "90s", animationDirection: reverse ? "reverse" : "normal" }}
      >
        {[...row, ...row].map((cover, index) => (
          <Cover key={`${cover.id}-${index}`} cover={cover} width={150} cut={10} className="w-[112px] sm:w-[150px]" />
        ))}
      </div>
    </div>
  );
}

export function Final({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  return (
    <>
      <section className="relative overflow-hidden pb-24 pt-16 sm:pb-32">
        <div aria-hidden className="pointer-events-none flex flex-col gap-4 opacity-45 [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
          <Marquee />
          <Marquee reverse offset={14} />
        </div>
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgb(11_11_13/0.92),rgb(11_11_13/0.5)_70%,transparent)]" />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex max-w-[720px] flex-col items-center text-center"
          >
            <Mark size={44} />
            <h2 className="headline mt-6 text-fg">{t.final.title}</h2>
            <p className="lede mt-5 max-w-[440px]">{t.final.lede}</p>
            <div className="mt-9">
              <PrimaryButton href={BOT_URL} icon={<TelegramIcon />}>
                {t.final.primary}
              </PrimaryButton>
            </div>
          </motion.div>
        </div>
      </section>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-8 text-[13px] text-fg3 sm:flex-row sm:items-center sm:px-8">
          <span className="flex items-center gap-2">
            <Mark size={18} />
            <span>{t.footer.note}</span>
          </span>
          <span className="flex items-center gap-5 sm:ml-auto">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-fg">
              <GithubIcon size={14} />
              {t.footer.made}
            </a>
            <a href={BOT_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-fg">
              <TelegramIcon size={14} />
              Telegram
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}

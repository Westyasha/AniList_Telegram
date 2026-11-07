"use client";

import { motion } from "motion/react";
import { COPY } from "@/lib/copy";
import { GITHUB_URL, type Locale } from "@/lib/site";
import { GithubIcon, SecondaryButton, SectionLabel } from "./brand";
import { Reveal } from "./Reveal";

export function Source({ locale }: { locale: Locale }) {
  const t = COPY[locale].source;
  return (
    <section id="source" className="relative py-28 sm:py-40">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-14 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <SectionLabel index={t.index} label={t.label} />
          <h2 className="headline mt-5 text-fg">{t.title}</h2>
          <p className="lede mt-5 max-w-[460px]">{t.lede}</p>
          <div className="mt-9">
            <SecondaryButton href={GITHUB_URL} icon={<GithubIcon />}>
              {t.cta}
            </SecondaryButton>
          </div>
        </Reveal>
        <ul className="border-t border-line">
          {t.stack.map(([layer, tech], index) => (
            <motion.li
              key={layer}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: index * 0.06 }}
              className="group grid grid-cols-[96px_1fr] items-baseline gap-4 border-b border-line py-5 sm:grid-cols-[140px_1fr]"
            >
              <span className="text-[15px] text-fg3 transition-colors group-hover:text-fg2">{layer}</span>
              <span className="figure text-[15px] text-fg sm:text-[17px]">{tech}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

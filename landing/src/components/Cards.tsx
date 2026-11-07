"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import card from "@/assets/card.jpg";
import wrapped from "@/assets/wrapped.jpg";
import { COPY } from "@/lib/copy";
import type { Locale } from "@/lib/site";
import { SectionLabel } from "./brand";
import { Reveal } from "./Reveal";

export function Cards({ locale }: { locale: Locale }) {
  const t = COPY[locale].cards;
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.84, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.2, 1]);
  const { scrollYProgress: pass } = useScroll({ target: stage, offset: ["start end", "end start"] });
  const wrappedY = useTransform(pass, [0, 1], [140, -100]);
  const wrappedRotate = useTransform(pass, [0, 1], [8, -3]);

  return (
    <section id="cards" className="relative overflow-hidden py-28 sm:py-40">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <Reveal className="max-w-[720px]">
          <SectionLabel index={t.index} label={t.label} />
          <h2 className="headline mt-5 text-fg">{t.title}</h2>
          <p className="lede mt-5 max-w-[560px]">{t.lede}</p>
        </Reveal>

        <div ref={stage} className="relative mt-16 [perspective:1600px] lg:pr-[220px]">
          <motion.div style={{ scale, rotateX, opacity }} className="origin-bottom overflow-hidden rounded-[14px] shadow-[0_60px_120px_-40px_rgb(0_0_0/0.9),inset_0_0_0_1px_var(--color-line)]">
            <Image src={card} alt={t.cardAlt} placeholder="blur" sizes="(min-width: 1240px) 960px, 100vw" className="block h-auto w-full" />
          </motion.div>
          <motion.div
            style={{ y: wrappedY, rotate: wrappedRotate }}
            className="absolute -bottom-10 right-0 hidden w-[260px] overflow-hidden rounded-[18px] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.95),inset_0_0_0_1px_var(--color-line)] lg:block"
          >
            <Image src={wrapped} alt={t.wrappedAlt} placeholder="blur" sizes="260px" className="block h-auto w-full" />
          </motion.div>
        </div>

        <div className="mt-10 lg:hidden">
          <Reveal className="mx-auto w-[62%] max-w-[300px] overflow-hidden rounded-[16px] shadow-[inset_0_0_0_1px_var(--color-line)]">
            <Image src={wrapped} alt={t.wrappedAlt} placeholder="blur" sizes="300px" className="block h-auto w-full" />
          </Reveal>
        </div>

        <dl className="mt-20 grid grid-cols-1 gap-8 border-t border-line pt-8 sm:grid-cols-3">
          {t.figures.map(([value, label], index) => (
            <Reveal key={value} delay={index * 0.08}>
              <dt className="figure text-[clamp(32px,4vw,48px)] font-medium leading-none tracking-[-0.03em] text-fg">{value}</dt>
              <dd className="mt-3 max-w-[260px] text-[15px] leading-[22px] text-fg3">{label}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

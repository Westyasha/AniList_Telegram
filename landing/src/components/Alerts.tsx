"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { COPY } from "@/lib/copy";
import { aired, type Locale } from "@/lib/site";
import { AlertMessage } from "./AlertMessage";
import { SectionLabel } from "./brand";
import { Reveal } from "./Reveal";

const EASE = [0.2, 0.8, 0.2, 1] as const;
const VISIBLE = 3;

export function Alerts({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const t = copy.alerts;
  const panel = useRef<HTMLDivElement>(null);
  const inView = useInView(panel, { amount: 0.4 });
  const [head, setHead] = useState(VISIBLE - 1);

  useEffect(() => {
    if (!inView) return;
    const timer = window.setInterval(() => setHead((value) => value + 1), 2600);
    return () => window.clearInterval(timer);
  }, [inView]);

  const feed = Array.from({ length: VISIBLE }, (_, offset) => head - offset).map((n) => ({ key: n, item: aired[((n % aired.length) + aired.length) % aired.length] }));

  return (
    <section id="alerts" className="relative py-28 sm:py-40">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-14 px-4 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <SectionLabel index={t.index} label={t.label} />
            <h2 className="headline mt-5 text-fg">{t.title}</h2>
            <p className="lede mt-5 max-w-[480px]">{t.lede}</p>
          </Reveal>
          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8">
            {t.facts.map(([value, label], index) => (
              <Reveal key={value} delay={0.08 * index}>
                <dt className="text-[20px] font-medium tracking-[-0.01em] text-fg">{value}</dt>
                <dd className="mt-1 text-[14px] leading-[20px] text-fg3">{label}</dd>
              </Reveal>
            ))}
          </dl>
        </div>

        <div ref={panel} className="relative">
          <div className="relative mx-auto max-w-[440px] rounded-panel bg-s1 p-4 shadow-[inset_0_0_0_1px_var(--color-line)] sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-[13px] text-fg3">
              <span className="live size-1.5 rounded-full bg-good" />
              <span className="text-fg2">{t.live}</span>
              <span className="figure ml-auto">*/5 * * * *</span>
            </div>
            <div className="relative h-[440px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
              <ul className="flex flex-col gap-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {feed.map(({ key, item }, index) => (
                    <motion.li
                      key={key}
                      layout
                      initial={{ opacity: 0, y: -40, scale: 0.94 }}
                      animate={{ opacity: 1 - index * 0.22, y: 0, scale: 1 - index * 0.03 }}
                      exit={{ opacity: 0, y: 30, scale: 0.9 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="origin-top"
                    >
                      <AlertMessage item={item} t={copy.alert} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

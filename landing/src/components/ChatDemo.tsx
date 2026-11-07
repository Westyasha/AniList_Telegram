"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { COPY, type ChatScreen, type Copy } from "@/lib/copy";
import { featured, type Locale } from "@/lib/site";
import { Mark, SectionLabel } from "./brand";

const EASE = [0.2, 0.8, 0.2, 1] as const;

function RichLine({ line }: { line: string }) {
  if (!line) return <span className="block h-2.5" />;
  const parts = line.split("**");
  return (
    <span className="block truncate">
      {parts.map((part, index) => (index % 2 ? <b key={index} className="font-semibold text-fg">{part}</b> : <span key={index}>{part}</span>))}
    </span>
  );
}

function Message({ screen, step, t }: { screen: ChatScreen; step: number; t: Copy["bot"] }) {
  return (
    <motion.div layout transition={{ layout: { duration: 0.42, ease: EASE } }} className="w-full max-w-[400px]">
      <motion.div layout className="overflow-hidden rounded-[16px] rounded-bl-[6px] bg-tg-bubble shadow-[inset_0_0_0_1px_rgb(255_255_255/0.05)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.18 }}
          >
            {screen.preview ? (
              <div className="p-1.5 pb-0">
                <div className="relative aspect-[2.3] overflow-hidden rounded-[11px]" style={{ background: featured.color }}>
                  <Image src={featured.banner} alt="" width={800} height={348} className="absolute inset-0 size-full object-cover" />
                </div>
              </div>
            ) : null}
            <div className="px-3.5 pb-2 pt-2.5 text-[14px] leading-[21px] text-fg2">
              {screen.lines.map((line, index) => (
                <RichLine key={index} line={line} />
              ))}
              <span className="mt-0.5 block text-right text-[11px] text-fg3">
                {step > 0 ? `${t.edited} ` : ""}21:04
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <motion.div layout className="mt-1 flex flex-col gap-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-1"
          >
            {screen.keys.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-1">
                {row.map((key, keyIndex) => {
                  const tap = screen.tap?.[0] === rowIndex && screen.tap?.[1] === keyIndex;
                  return (
                    <span
                      key={key}
                      className={`relative flex h-9 min-w-0 flex-1 items-center justify-center rounded-[8px] bg-tg-key px-2 text-[13px] text-fg ${
                        tap ? "shadow-[inset_0_0_0_1px_var(--color-accent)]" : ""
                      }`}
                    >
                      <span className="truncate">{key}</span>
                      {tap ? (
                        <motion.span
                          aria-hidden
                          className="absolute inset-0 rounded-[8px] bg-accent/25"
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ) : null}
                    </span>
                  );
                })}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Heading({ t, className }: { t: Copy["bot"]; className?: string }) {
  return (
    <div className={className}>
      <SectionLabel index={t.index} label={t.label} />
      <h2 className="headline mt-5 text-fg">{t.title}</h2>
      <p className="lede mt-5 max-w-[460px]">{t.lede}</p>
    </div>
  );
}

export function ChatDemo({ locale }: { locale: Locale }) {
  const t = COPY[locale].bot;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const [step, setStep] = useState(0);
  const count = t.screens.length;

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setStep(Math.min(count - 1, Math.max(0, Math.floor(value * count * 1.02))));
  });

  const screen = t.screens[step];

  return (
    <section id="bot" className="relative scroll-mt-0">
      <Heading t={t} className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-8 lg:hidden" />
      <div ref={ref} className="relative" style={{ height: `${count * 90 + 30}svh` }}>
        <div className="sticky top-0 flex h-[100svh] items-center">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-12 px-4 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="hidden lg:block">
              <Heading t={t} />
              <ol className="relative mt-12 flex flex-col gap-1 pl-6">
                <span aria-hidden className="absolute bottom-2 left-0 top-2 w-px bg-line" />
                <motion.span aria-hidden style={{ scaleY: fill }} className="absolute bottom-2 left-0 top-2 w-px origin-top bg-accent" />
                {t.steps.map((item, index) => (
                  <li key={item.title} className="py-2.5">
                    <p className={`flex items-baseline gap-3 text-[17px] font-medium transition-colors duration-300 ${index === step ? "text-fg" : "text-fg3"}`}>
                      <span className="figure text-[12px] text-fg3">0{index + 1}</span>
                      {item.title}
                    </p>
                    <motion.p
                      initial={false}
                      animate={{ height: index === step ? "auto" : 0, opacity: index === step ? 1 : 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden pl-8 text-[15px] leading-[22px] text-fg2"
                    >
                      <span className="block pt-1.5">{item.body}</span>
                    </motion.p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col items-center gap-5">
              <div className="w-full max-w-[460px] overflow-hidden rounded-panel bg-tg shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9),inset_0_0_0_1px_rgb(255_255_255/0.06)]">
                <div className="flex items-center gap-3 border-b border-line bg-s1/80 px-4 py-3">
                  <span className="grid size-9 place-items-center rounded-full bg-s3">
                    <Mark size={20} />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[15px] font-medium text-fg">{t.name}</span>
                    <span className="text-[12px] text-fg3">{t.tag}</span>
                  </span>
                  <span className="figure ml-auto text-[12px] text-fg3">{t.count(step)}</span>
                </div>
                <div className="relative flex h-[min(560px,64svh)] flex-col justify-end gap-2 bg-[radial-gradient(rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[length:18px_18px] p-3 sm:p-4">
                  <AnimatePresence>
                    {screen.toast ? (
                      <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="absolute inset-x-0 top-4 z-10 mx-auto w-fit rounded-[10px] bg-black/80 px-4 py-2 text-[14px] text-fg backdrop-blur"
                      >
                        {screen.toast}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  <span className="self-end rounded-[16px] rounded-br-[6px] bg-accent/90 px-3.5 py-2 text-[14px] text-white">/start</span>
                  <Message screen={screen} step={step} t={t} />
                </div>
              </div>
              <div className="h-16 w-full max-w-[460px] lg:hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="text-[15px] leading-[22px] text-fg2"
                  >
                    <span className="figure mr-2 text-[12px] text-fg3">0{step + 1}</span>
                    <span className="font-medium text-fg">{t.steps[step].title}.</span> {t.steps[step].body}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

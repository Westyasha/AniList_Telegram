"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import editor from "@/assets/app-editor.jpg";
import home from "@/assets/app-home.jpg";
import library from "@/assets/app-library.jpg";
import media from "@/assets/app-media.jpg";
import profile from "@/assets/app-profile.jpg";
import schedule from "@/assets/app-schedule.jpg";
import search from "@/assets/app-search.jpg";
import { COPY } from "@/lib/copy";
import type { Locale } from "@/lib/site";
import { SectionLabel } from "./brand";
import { Phone } from "./Phone";

const SHOTS = [home, media, search, profile, library, editor, schedule];

export function Gallery({ locale }: { locale: Locale }) {
  const t = COPY[locale].app;
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });
  const x = useTransform(smooth, (value) => -value * distance);
  const bar = useTransform(smooth, [0, 1], [0.08, 1]);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () => setDistance(Math.max(0, element.scrollWidth - window.innerWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section id="app" className="relative">
      <div ref={section} className="relative h-[340svh]">
        <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
          <motion.div ref={track} style={{ x }} className="flex w-max items-center gap-6 px-4 sm:gap-10 sm:px-8 lg:px-[max(32px,calc((100vw-1240px)/2+32px))]">
            <div className="w-[min(84vw,420px)] shrink-0 pr-4">
              <SectionLabel index={t.index} label={t.label} />
              <h2 className="headline mt-5 text-fg">{t.title}</h2>
              <p className="lede mt-5">{t.lede}</p>
            </div>
            {SHOTS.map((shot, index) => (
              <figure key={index} className="shrink-0" style={{ width: "min(270px, calc((100svh - 190px) / 2.164), 68vw)" }}>
                <Phone src={shot} alt={t.shots[index][0]} />
                <figcaption className="mt-5 flex items-baseline gap-3 px-1">
                  <span className="figure text-[12px] text-fg3">0{index + 1}</span>
                  <span className="text-[15px] font-medium text-fg">{t.shots[index][0]}</span>
                  <span className="hidden truncate text-[14px] text-fg3 sm:block">{t.shots[index][1]}</span>
                </figcaption>
              </figure>
            ))}
            <div className="w-4 shrink-0" />
          </motion.div>
          <div className="mx-auto mt-8 h-px w-[min(240px,50vw)] bg-line">
            <motion.div style={{ scaleX: bar }} className="h-px origin-left bg-fg2" />
          </div>
        </div>
      </div>
    </section>
  );
}

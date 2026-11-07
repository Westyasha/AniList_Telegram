"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { TrendingMedia } from "@/api/types";
import { useAuthGuard } from "@/api/auth";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { mediaMeta } from "@/lib/media";
import { statusLabel } from "@/lib/status";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Banner } from "@/components/media/Banner";
import { AverageScore, StatusDot } from "@/components/media/Marks";
import { useListIndex } from "@/components/media/ListIndex";
import { openListEditor } from "@/components/media/ListEditor";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Figures } from "@/components/ui/Figures";
import { Wordmark } from "@/components/brand/Mark";
import { HeaderActions } from "@/components/shell/PageHeader";
import { useAmbient } from "@/components/shell/Ambient";

const HERO_HEIGHT = 340;

function HeroTop() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-safe">
      <div className="pointer-events-auto flex min-h-16 items-center px-4 pt-2">
        <Wordmark />
        <HeaderActions className="-mr-3 ml-auto" />
      </div>
    </div>
  );
}

function Slide({ media, rank, active }: { media: TrendingMedia; rank: number; active: boolean }) {
  const t = useT();
  const title = useTitle()(media.title);
  const guard = useAuthGuard();
  const index = useListIndex();
  const entry = index.get(media.id);
  const meta = mediaMeta(media, t);
  const openEditor = guard(() => openListEditor({ media, entry: entry ?? null }));

  return (
    <div className="relative w-full shrink-0 snap-center" aria-hidden={!active} inert={!active}>
      <Link href={`/media/${media.id}`} aria-label={title} className="block">
        <Banner src={media.bannerImage} height={HERO_HEIGHT} preload={rank === 1} />
      </Link>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4 pb-1">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-3 text-13 text-fg2">
            <Figures text={t.home.rank(rank)} />
            <AverageScore value={media.averageScore} />
          </span>
          <Link href={`/media/${media.id}`} className="pointer-events-auto line-clamp-2 text-24 font-semibold text-fg">
            {title}
          </Link>
          <span className="truncate text-13 text-fg2">{meta}</span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {entry?.status ? (
            <Button variant="secondary" onClick={openEditor}>
              <span className="flex items-center gap-2">
                <StatusDot status={entry.status} />
                {statusLabel(t, media.type, entry.status)}
              </span>
            </Button>
          ) : (
            <Button variant="primary" onClick={openEditor}>
              {t.media.addToList}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Hero({ items, loading }: { items: TrendingMedia[] | undefined; loading: boolean }) {
  const t = useT();
  const slides = (items ?? []).filter((media) => media.bannerImage && !media.isAdult).slice(0, 5);
  const [active, setActive] = useState(0);
  useAmbient(slides[active]?.coverImage.large ?? slides[active]?.bannerImage);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = scroller.current;
      if (!node) return;
      const next = Math.round(node.scrollLeft / node.clientWidth);
      setActive((prev) => {
        if (prev !== next) haptic.selection();
        return next;
      });
    });
  };

  const goTo = (index: number) => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTo({ left: index * node.clientWidth, behavior: "smooth" });
  };

  if (loading || slides.length === 0) {
    return (
      <div className="relative">
        <HeroTop />
        <Skeleton className="w-full" style={{ height: `calc(${HERO_HEIGHT}px + var(--safe-top))` }} />
        <div className="h-8" />
      </div>
    );
  }

  return (
    <section aria-roledescription="carousel" aria-label={t.home.trending} className="relative">
      <HeroTop />
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
        {slides.map((media, index) => (
          <Slide key={media.id} media={media} rank={index + 1} active={index === active} />
        ))}
      </div>
      <div className="flex h-8 items-center gap-1 px-4">
        {slides.map((media, index) => (
          <button
            key={media.id}
            type="button"
            aria-label={`${index + 1} / ${slides.length}`}
            aria-current={index === active || undefined}
            onClick={() => goTo(index)}
            className="hit flex h-8 w-6 items-center"
          >
            <span className={cn("block h-0.5 w-full transition-colors duration-220", index === active ? "bg-fg" : "bg-fg/20")} />
          </button>
        ))}
      </div>
    </section>
  );
}

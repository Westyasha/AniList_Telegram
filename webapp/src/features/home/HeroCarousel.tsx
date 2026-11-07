import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Star } from "lucide-react";
import type { TrendingMedia } from "@/api/types";
import { useTitle } from "@/api/session";
import { useT } from "@/lib/i18n";
import { accentStyle } from "@/lib/color";
import { plainText } from "@/lib/text";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { scoreTone } from "@/lib/score";
import { cn } from "@/lib/cn";
import { Image } from "@/components/ui/Image";
import { Skeleton } from "@/components/ui/Skeleton";

const INTERVAL = 6500;

export function HeroSkeleton() {
  return (
    <div className="px-4">
      <Skeleton className="h-[236px] w-full rounded-2xl" />
    </div>
  );
}

export function HeroCarousel({ items }: { items: TrendingMedia[] }) {
  const t = useT();
  const title = useTitle();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const reduced = usePrefersReducedMotion();
  const slides = items.slice(0, 8);

  const goTo = useCallback((next: number) => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTo({ left: next * node.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const onScroll = () => setIndex(Math.round(node.scrollLeft / Math.max(1, node.clientWidth)));
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (reduced || slides.length < 2) return;
    const id = window.setInterval(() => {
      if (paused.current || document.hidden) return;
      goTo((index + 1) % slides.length);
    }, INTERVAL);
    return () => window.clearInterval(id);
  }, [index, slides.length, goTo, reduced]);

  const hold = () => {
    paused.current = true;
  };
  const release = () => {
    window.setTimeout(() => {
      paused.current = false;
    }, 2500);
  };

  return (
    <section aria-roledescription="carousel" aria-label={t.home.trending} className="relative">
      <div
        ref={scroller}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        onPointerDown={hold}
        onPointerUp={release}
        onPointerCancel={release}
        onTouchStart={hold}
        onTouchEnd={release}
      >
        {slides.map((media, position) => {
          const name = title(media.title);
          const synopsis = plainText(media.description);
          return (
            <div key={media.id} className="w-full shrink-0 snap-center px-4" aria-roledescription="slide" aria-label={`${position + 1} / ${slides.length}`}>
              <Link
                to={`/media/${media.id}`}
                style={accentStyle(media.coverImage.color)}
                className="relative block h-[236px] overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <Image
                  src={media.bannerImage ?? media.coverImage.extraLarge}
                  alt=""
                  color={media.coverImage.color}
                  eager={position === 0}
                  className="absolute inset-0"
                  imgClassName={media.bannerImage ? "" : "object-[center_25%]"}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(8,8,11,0.05) 0%, rgba(8,8,11,0.35) 45%, rgba(8,8,11,0.94) 100%), linear-gradient(90deg, rgb(var(--accent-rgb, 224 35 61) / 0.28), transparent 60%)",
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-3.5 p-4">
                  <Image
                    src={media.coverImage.large}
                    alt=""
                    color={media.coverImage.color}
                    eager={position === 0}
                    className="aspect-[2/3] w-[78px] shrink-0 rounded-lg shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
                  />
                  <div className="min-w-0 flex-1 pb-0.5">
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold">
                      <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[var(--accent-text)]">{t.home.rank(position + 1)}</span>
                      {media.averageScore != null && (
                        <span className="tabular inline-flex items-center gap-1" style={{ color: scoreTone(media.averageScore) }}>
                          <Star className="size-3 fill-current" />
                          {media.averageScore}%
                        </span>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-[17px] leading-tight font-extrabold tracking-[-0.01em] text-white">{name}</h3>
                    {synopsis && <p className="mt-1 line-clamp-1 text-xs text-white/60">{synopsis}</p>}
                    <p className="mt-1.5 truncate text-[11px] font-semibold text-white/55">
                      {[media.format ? t.enums.format[media.format] : null, ...media.genres.slice(0, 3)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {slides.map((media, position) => (
          <button
            key={media.id}
            type="button"
            aria-label={`${position + 1}`}
            aria-current={position === index}
            onClick={() => goTo(position)}
            className="flex h-4 items-center"
          >
            <span
              className={cn(
                "block h-1 rounded-full transition-all duration-300",
                position === index ? "w-5 bg-primary" : "w-1.5 bg-white/20",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

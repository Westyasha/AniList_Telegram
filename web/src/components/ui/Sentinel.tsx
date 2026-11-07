"use client";

import { useEffect, useRef } from "react";

export function Sentinel({ hasMore, loading, onMore }: { hasMore: boolean; loading: boolean; onMore: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onMore);

  useEffect(() => {
    callback.current = onMore;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (!hasMore) return null;
  return <div ref={ref} aria-hidden className="h-12" />;
}

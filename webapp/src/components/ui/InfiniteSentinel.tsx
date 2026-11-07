import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";

interface InfiniteSentinelProps {
  hasMore: boolean;
  loading: boolean;
  onMore: () => void;
}

export function InfiniteSentinel({ hasMore, loading, onMore }: InfiniteSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onMore);
  callback.current = onMore;

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  if (!hasMore && !loading) return null;
  return (
    <div ref={ref} className="flex h-16 items-center justify-center text-faint">
      {loading && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={className ?? "flex h-40 items-center justify-center text-faint"}>
      <LoaderCircle className="size-6 animate-spin" aria-hidden />
    </div>
  );
}

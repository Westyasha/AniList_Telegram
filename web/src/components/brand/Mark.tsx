import { cn } from "@/lib/cn";

export function Mark({ size = 28, className, label = "AniList" }: { size?: number; className?: string; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label} className={cn("shrink-0", className)}>
      <path fillRule="evenodd" fill="#EDEDF0" d="M2 56 17.5 8h9.5L42.5 56h-8.6l-3.1-9.8H15.7L12.6 56Zm16.2-17.4h10.2L23.3 22.4Z" />
      <path fill="#E0233D" d="M46 8h6l4 4v36h6v8H46Z" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark size={24} />
      <span className="text-17 font-semibold text-fg">AniList</span>
    </span>
  );
}

export function Facet({ direction = "up", className }: { direction?: "up" | "down"; className?: string }) {
  return (
    <svg aria-hidden width="10" height="5" viewBox="0 0 10 5" className={cn("block shrink-0", className)}>
      <path fill="#E0233D" d={direction === "up" ? "M0 5 5 0l5 5Z" : "M0 0h10L5 5Z"} />
    </svg>
  );
}

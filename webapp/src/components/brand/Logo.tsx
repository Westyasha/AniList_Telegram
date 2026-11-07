import { cn } from "@/lib/cn";

interface LogoProps {
  size?: number;
  className?: string;
  title?: string;
}

export function Logo({ size = 32, className, title = "AniList" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <polygon points="6,56 20,8 26.5,8 14.5,56" fill="#FFFFFF" />
      <polygon points="20,8 26.5,8 23.4,19" fill="#D9D9E1" />
      <polygon points="26.5,8 40,56 31.5,56 23.4,19" fill="#C3C3CD" />
      <polygon points="26.5,8 40,56 36,56" fill="#A9A9B5" />
      <polygon points="13.2,41 33.3,41 35.2,47.5 11.4,47.5" fill="#ECECF1" />
      <polygon points="11.4,47.5 35.2,47.5 34.4,45 12.1,45" fill="#BDBDC7" />
      <polygon points="42,8 50.5,8 50.5,45.5 42,56" fill="#E0233D" />
      <polygon points="50.5,8 50.5,45.5 46.5,50 46.5,8" fill="#B0122C" />
      <polygon points="42,8 46.5,8 46.5,14" fill="#F0475E" />
      <polygon points="50.5,45.5 61,45.5 58.5,56 42,56" fill="#8E0C22" />
      <polygon points="50.5,45.5 61,45.5 62.5,39.5 50.5,39.5" fill="#F0475E" />
      <polygon points="50.5,39.5 62.5,39.5 61.6,43" fill="#E0233D" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo size={28} />
      <span className="text-[17px] leading-none font-extrabold tracking-[-0.02em]">
        Ani<span className="text-primary">List</span>
      </span>
    </span>
  );
}

import type { ReactNode } from "react";

export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="AniList" className={className}>
      <path fillRule="evenodd" fill="#EDEDF0" d="M2 56 17.5 8h9.5L42.5 56h-8.6l-3.1-9.8H15.7L12.6 56Zm16.2-17.4h10.2L23.3 22.4Z" />
      <path fill="#E0233D" d="M46 8h6l4 4v36h6v8H46Z" />
    </svg>
  );
}

export function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M21.94 4.3 18.8 19.12c-.24 1.05-.86 1.31-1.74.82l-4.8-3.54-2.32 2.23c-.26.26-.47.47-.96.47l.34-4.89 8.9-8.04c.39-.34-.08-.53-.6-.19L6.62 12.9l-4.74-1.48c-1.03-.32-1.05-1.03.21-1.52L20.6 2.77c.86-.32 1.61.19 1.34 1.53Z" />
    </svg>
  );
}

export function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-fg3">
      <span className="facet figure bg-s3 px-2 py-0.5 text-fg2 [--cut:5px]">{index}</span>
      <span>{label}</span>
    </div>
  );
}

const BUTTON = "group inline-flex h-12 items-center gap-2.5 px-5 text-[15px] font-medium transition-colors";

export function PrimaryButton({ href, children, icon }: { href: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`${BUTTON} facet bg-accent text-white [--cut:12px] hover:bg-accent-press`}>
      {icon}
      <span>{children}</span>
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">
        <ArrowIcon />
      </span>
    </a>
  );
}

export function SecondaryButton({ href, children, icon }: { href: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`${BUTTON} rounded-control text-fg hairline hover:bg-s2`}>
      {icon}
      <span>{children}</span>
    </a>
  );
}

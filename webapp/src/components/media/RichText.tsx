import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { parseRich } from "@/lib/text";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";

function Spoiler({ text }: { text: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={open ? undefined : t.media.spoiler}
      data-open={open}
      className="spoiler px-0.5"
      onClick={(event) => {
        event.stopPropagation();
        setOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") setOpen(true);
      }}
    >
      {text}
    </span>
  );
}

export function RichText({ source, collapsedLines = 5, className }: { source: string | null | undefined; collapsedLines?: number; className?: string }) {
  const t = useT();
  const segments = useMemo(() => parseRich(source), [source]);
  const length = segments.reduce((sum, segment) => sum + segment.value.length, 0);
  const collapsible = length > 320;
  const [expanded, setExpanded] = useState(false);

  if (segments.length === 0) return <p className={cn("text-[13.5px] text-faint", className)}>{t.media.noDescription}</p>;

  return (
    <div className={className}>
      <div
        className={cn("relative text-[13.5px] leading-[1.6] whitespace-pre-line text-fg/80", collapsible && !expanded && "overflow-hidden")}
        style={collapsible && !expanded ? { maxHeight: `${collapsedLines * 1.6}em` } : undefined}
      >
        {segments.map((segment, index) =>
          segment.kind === "spoiler" ? <Spoiler key={index} text={segment.value} /> : <span key={index}>{segment.value}</span>,
        )}
        {collapsible && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bg to-transparent" />
        )}
      </div>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1 inline-flex h-10 items-center gap-1 text-[13px] font-semibold text-[var(--accent-text)]"
        >
          {expanded ? t.common.showLess : t.common.readMore}
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

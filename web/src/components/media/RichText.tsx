"use client";

import { useMemo, useState } from "react";
import { parseRich } from "@/lib/text";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";

function Spoiler({ text }: { text: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (open) return <span>{text}</span>;
  return (
    <button type="button" aria-label={t.media.spoiler} title={t.media.spoiler} className="spoiler px-0.5 text-left" onClick={() => setOpen(true)}>
      {text}
    </button>
  );
}

export function RichText({ source, collapsedLines = 5, className }: { source: string | null | undefined; collapsedLines?: number; className?: string }) {
  const t = useT();
  const segments = useMemo(() => parseRich(source), [source]);
  const length = segments.reduce((sum, segment) => sum + segment.value.length, 0);
  const collapsible = length > 300;
  const [expanded, setExpanded] = useState(false);

  if (segments.length === 0) return <p className={cn("text-15 text-fg3", className)}>{t.media.noDescription}</p>;

  const collapsed = collapsible && !expanded;

  return (
    <div className={className}>
      <div
        className={cn("text-15 whitespace-pre-line text-fg2", collapsed && "overflow-hidden")}
        style={collapsed ? { maxHeight: `${collapsedLines * 22}px`, maskImage: "linear-gradient(to bottom, #000 60%, transparent)" } : undefined}
      >
        {segments.map((segment, index) => (segment.kind === "spoiler" ? <Spoiler key={index} text={segment.value} /> : <span key={index}>{segment.value}</span>))}
      </div>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1 inline-flex h-11 items-center text-13 font-medium text-fg transition-colors hover:text-fg2"
        >
          {expanded ? t.common.showLess : t.common.readMore}
        </button>
      ) : null}
    </div>
  );
}

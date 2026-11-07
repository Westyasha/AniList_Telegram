export type RichSegment = { kind: "text"; value: string } | { kind: "spoiler"; value: string };

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&#039;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&[a-z0-9]+;/gi, (entity) => ENTITIES[entity] ?? entity);
}

export function stripMarkup(input: string | null | undefined): string {
  if (!input) return "";
  const cleaned = input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/img\d*%?\([^)]*\)/gi, "")
    .replace(/youtube\([^)]*\)|webm\([^)]*\)/gi, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)([\s\S]+?)\1/g, "$2")
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/gm, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/~~~|~~/g, "")
    .replace(/\r/g, "");
  return decodeEntities(cleaned).replace(/\n{3,}/g, "\n\n").trim();
}

export function parseRich(input: string | null | undefined): RichSegment[] {
  if (!input) return [];
  const segments: RichSegment[] = [];
  const pattern = /~!([\s\S]*?)!~/g;
  let cursor = 0;
  let match = pattern.exec(input);
  while (match !== null) {
    if (match.index > cursor) segments.push({ kind: "text", value: stripMarkup(input.slice(cursor, match.index)) });
    segments.push({ kind: "spoiler", value: stripMarkup(match[1]) });
    cursor = match.index + match[0].length;
    match = pattern.exec(input);
  }
  if (cursor < input.length) segments.push({ kind: "text", value: stripMarkup(input.slice(cursor)) });
  return segments.filter((segment) => segment.value.length > 0);
}

export function plainText(input: string | null | undefined): string {
  return stripMarkup((input ?? "").replace(/~![\s\S]*?!~/g, ""));
}

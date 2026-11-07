const NAMED: Record<string, string> = {
  blue: "#3DB4F2",
  purple: "#C063FF",
  pink: "#FC9DD6",
  orange: "#EF881A",
  red: "#E13333",
  green: "#4CC38A",
  gray: "#8A94A6",
};

const FALLBACK = "#E0233D";

export function profileAccent(color: string | null | undefined): string {
  if (!color) return FALLBACK;
  const named = NAMED[color.toLowerCase()];
  if (named) return named;
  return /^#[0-9a-f]{6}$/i.test(color) ? color : FALLBACK;
}

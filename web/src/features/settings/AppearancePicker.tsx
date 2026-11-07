"use client";

import { Check } from "lucide-react";
import { useAppearance } from "@/components/shell/AppearanceProvider";
import { ACCENTS, ACCENT_HEX, THEMES, type Accent, type Theme } from "@/lib/appearance";
import { profileColorStore } from "@/lib/appearance";
import { profileAccent } from "@/lib/profileColor";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

const PREVIEW: Record<Theme, { bg: string; surface: string; line: string; text: string; glass?: boolean; split?: boolean }> = {
  dark: { bg: "#0B0B0D", surface: "#18181C", line: "rgb(237 237 240 / 0.1)", text: "#EDEDF0" },
  light: { bg: "#F5F5F7", surface: "#FFFFFF", line: "rgb(20 20 24 / 0.1)", text: "#131316" },
  system: { bg: "#0B0B0D", surface: "#18181C", line: "rgb(237 237 240 / 0.1)", text: "#EDEDF0", split: true },
  glass: { bg: "#1a1030", surface: "rgb(255 255 255 / 0.14)", line: "rgb(255 255 255 / 0.18)", text: "#F4F4F7", glass: true },
};

function ThemePreview({ theme, accent }: { theme: Theme; accent: string }) {
  const p = PREVIEW[theme];
  return (
    <div
      aria-hidden
      className="relative h-20 w-full overflow-hidden rounded-control"
      style={{
        background: p.glass
          ? "linear-gradient(135deg, #3b1d5e 0%, #7a2d4a 45%, #1f3d5c 100%)"
          : p.split
            ? "linear-gradient(115deg, #0B0B0D 0 50%, #F5F5F7 50% 100%)"
            : p.bg,
      }}
    >
      <div
        className="absolute inset-x-2 top-2 flex h-9 items-center gap-2 rounded-[6px] px-2"
        style={{
          background: p.surface,
          boxShadow: `inset 0 0 0 1px ${p.line}${p.glass ? ", inset 0 1px 0 rgb(255 255 255 / 0.25)" : ""}`,
          backdropFilter: p.glass ? "blur(6px)" : undefined,
        }}
      >
        <span className="h-6 w-4 shrink-0 rounded-[2px]" style={{ background: accent, clipPath: "polygon(0 0, 70% 0, 100% 30%, 100% 100%, 0 100%)" }} />
        <span className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-3/4 rounded-full" style={{ background: p.text, opacity: 0.9 }} />
          <span className="h-1.5 w-1/2 rounded-full" style={{ background: p.text, opacity: 0.4 }} />
        </span>
      </div>
      <span className="absolute bottom-2 left-2 h-2 w-10 rounded-full" style={{ background: accent }} />
    </div>
  );
}

export function AppearancePicker() {
  const t = useT();
  const [appearance, setAppearance] = useAppearance();
  const profileColor = useStore(profileColorStore);
  const accentOf = (accent: Accent) => (accent === "profile" ? profileAccent(profileColor) : ACCENT_HEX[accent]);
  const current = accentOf(appearance.accent);

  return (
    <section className="flex flex-col gap-4 px-4">
      <div>
        <h2 className="text-17 font-semibold text-fg">{t.settings.appearance}</h2>
        <p className="text-13 text-fg3">{t.settings.appearanceHint}</p>
      </div>

      <div role="radiogroup" aria-label={t.settings.theme} className="grid grid-cols-2 gap-3">
        {THEMES.map((theme) => {
          const selected = appearance.theme === theme;
          return (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                if (selected) return;
                haptic.selection();
                setAppearance({ theme });
              }}
              className={cn(
                "flex flex-col gap-2 rounded-card border p-2 text-left transition-colors",
                selected ? "border-accent bg-s2" : "border-line bg-s1 hover:border-line-strong",
              )}
            >
              <ThemePreview theme={theme} accent={current} />
              <span className="flex items-center justify-between gap-2 px-1 pb-0.5">
                <span className="text-15 text-fg">{t.settings.themes[theme]}</span>
                {selected ? <Icon icon={Check} className="text-accent-ink" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-13 text-fg3">{t.settings.accent}</span>
        <div role="radiogroup" aria-label={t.settings.accent} className="grid grid-cols-8 gap-1.5">
          {ACCENTS.map((accent) => {
            const selected = appearance.accent === accent;
            const color = accentOf(accent);
            return (
              <button
                key={accent}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t.settings.accents[accent]}
                title={t.settings.accents[accent]}
                onClick={() => {
                  if (selected) return;
                  haptic.selection();
                  setAppearance({ accent });
                }}
                className={cn(
                  "relative grid aspect-square w-full max-w-11 place-items-center rounded-full transition-transform pressed:scale-95",
                  selected && "ring-2 ring-fg ring-offset-2 ring-offset-bg",
                )}
              >
                <span
                  className="size-[72%] rounded-full"
                  style={{
                    background: accent === "profile" ? `conic-gradient(from 210deg, ${color}, ${color}cc, ${color})` : color,
                    boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.15)",
                  }}
                />
                {accent === "profile" ? <span className="absolute text-[11px] font-semibold text-white">AL</span> : null}
              </button>
            );
          })}
        </div>
        <p className="text-13 text-fg2">{t.settings.accents[appearance.accent]}</p>
      </div>
    </section>
  );
}

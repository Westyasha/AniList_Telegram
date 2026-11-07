"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession, useUpdateSettings } from "@/api/session";
import {
  SURFACE,
  appearanceStore,
  applyAppearance,
  loadAppearance,
  normalizeAppearance,
  profileColorStore,
  saveAppearance,
  type Appearance,
  type ResolvedTheme,
} from "@/lib/appearance";
import { useStore } from "@/lib/store";
import { onTelegramThemeChange, setChromeColor } from "@/lib/telegram";
import { Ambient } from "./Ambient";

export function useAppearance(): [Appearance, (next: Partial<Appearance>) => void] {
  const appearance = useStore(appearanceStore);
  const update = useUpdateSettings();
  const session = useSession();
  const set = useCallback(
    (next: Partial<Appearance>) => {
      const merged = normalizeAppearance({ ...appearanceStore.get(), ...next });
      appearanceStore.set(merged);
      saveAppearance(merged);
      if (!session.offline && session.user) update.mutate({ appearance: merged });
    },
    [session.offline, session.user, update],
  );
  return [appearance, set];
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const appearance = useStore(appearanceStore);
  const profileColor = useStore(profileColorStore);
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");
  const adopted = useRef(false);

  useEffect(() => {
    appearanceStore.set(loadAppearance());
  }, []);

  useEffect(() => {
    profileColorStore.set(session.anilist?.profile_color ?? null);
  }, [session.anilist?.profile_color]);

  useEffect(() => {
    if (adopted.current || session.offline || !session.appearance) return;
    adopted.current = true;
    const remote = normalizeAppearance(session.appearance);
    appearanceStore.set(remote);
    saveAppearance(remote);
  }, [session.offline, session.appearance]);

  useEffect(() => {
    const apply = () => {
      const theme = applyAppearance(appearance, profileColor);
      setResolved(theme);
      setChromeColor(SURFACE[theme]);
    };
    apply();
    if (appearance.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", apply);
    const offTelegram = onTelegramThemeChange(apply);
    return () => {
      media.removeEventListener("change", apply);
      offTelegram();
    };
  }, [appearance, profileColor]);

  return (
    <>
      {resolved === "glass" ? <Ambient /> : null}
      {children}
    </>
  );
}

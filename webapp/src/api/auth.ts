import { useCallback } from "react";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { request } from "./client";
import { fetchSession, SESSION_KEY, setSession, useViewer, type SessionState } from "./session";
import type { AuthLinkResponse, Session } from "./types";
import { createStore, useStore } from "@/lib/store";
import { haptic, isTelegram, openExternal, openTelegram } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import type { Dict } from "@/lib/i18n";

export type LoginPhase = "idle" | "starting" | "waiting";

interface LoginState {
  phase: LoginPhase;
  sheetOpen: boolean;
}

export const loginStore = createStore<LoginState>({ phase: "idle", sheetOpen: false });

const POLL_MS = 3000;
const MAX_WAIT_MS = 180_000;

let pollTimer: number | null = null;
let deadline = 0;

function clearPoll(): void {
  if (pollTimer !== null) window.clearTimeout(pollTimer);
  pollTimer = null;
  document.removeEventListener("visibilitychange", onVisible);
}

let activeTick: (() => void) | null = null;

function onVisible(): void {
  if (document.visibilityState === "visible" && activeTick) activeTick();
}

export function stopLogin(): void {
  clearPoll();
  activeTick = null;
  loginStore.set((prev) => ({ ...prev, phase: "idle" }));
}

function beginPolling(client: QueryClient, t: Dict): void {
  clearPoll();
  deadline = Date.now() + MAX_WAIT_MS;
  const tick = async () => {
    if (pollTimer !== null) window.clearTimeout(pollTimer);
    pollTimer = null;
    const session = await fetchSession();
    if (loginStore.get().phase !== "waiting") return;
    if (session.anilist) {
      clearPoll();
      activeTick = null;
      client.setQueryData<SessionState>(SESSION_KEY, session);
      loginStore.set({ phase: "idle", sheetOpen: false });
      haptic.notify("success");
      toast.success(t.auth.success);
      await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] });
      return;
    }
    if (Date.now() > deadline) {
      stopLogin();
      toast.error(t.auth.timeout);
      return;
    }
    pollTimer = window.setTimeout(() => void tick(), POLL_MS);
  };
  activeTick = () => void tick();
  document.addEventListener("visibilitychange", onVisible);
  pollTimer = window.setTimeout(() => void tick(), POLL_MS);
}

export async function startLogin(client: QueryClient, t: Dict): Promise<void> {
  if (!isTelegram()) {
    toast.info(t.auth.telegramOnly);
    return;
  }
  loginStore.set((prev) => ({ ...prev, phase: "starting" }));
  try {
    const { url, mode } = await request<AuthLinkResponse>("auth/link", { method: "POST", body: {} });
    if (mode === "bot" || /^https:\/\/t\.me\//.test(url)) openTelegram(url);
    else openExternal(url);
    loginStore.set((prev) => ({ ...prev, phase: "waiting" }));
    beginPolling(client, t);
  } catch {
    loginStore.set((prev) => ({ ...prev, phase: "idle" }));
    haptic.notify("error");
    toast.error(t.auth.failed);
  }
}

export function useLoginState(): LoginState {
  return useStore(loginStore);
}

export function openLoginSheet(): void {
  loginStore.set((prev) => ({ ...prev, sheetOpen: true }));
}

export function closeLoginSheet(): void {
  loginStore.set((prev) => ({ ...prev, sheetOpen: false }));
}

export function useAuthGuard(): <A extends unknown[]>(action: (...args: A) => void) => (...args: A) => void {
  const viewer = useViewer();
  return useCallback(
    <A extends unknown[]>(action: (...args: A) => void) =>
      (...args: A) => {
        if (!viewer) {
          haptic.impact("light");
          openLoginSheet();
          return;
        }
        action(...args);
      },
    [viewer],
  );
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => request<Session>("auth/logout", { method: "POST", body: {} }),
    onSuccess: (session) => {
      setSession(client, session);
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] });
    },
  });
}

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, request } from "./client";
import type { Lang, MediaTitle, NotificationSettings, Session, SettingsPayload } from "./types";
import { detectLang } from "@/lib/i18n";
import { getTelegramUser, isTelegram } from "@/lib/telegram";

export interface SessionState extends Session {
  offline: boolean;
}

export const SESSION_KEY = ["session"] as const;

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  enabled: true,
  airing_watching: true,
  airing_planning: false,
  airing_paused: false,
  airing_dropped: false,
  related: true,
  anilist_activity: true,
};

function guestSession(): SessionState {
  const tgUser = getTelegramUser();
  return {
    user: tgUser
      ? { id: tgUser.id, first_name: tgUser.first_name, last_name: tgUser.last_name, username: tgUser.username, photo_url: tgUser.photo_url }
      : null,
    lang: detectLang(tgUser?.language_code),
    bot_username: "",
    anilist: null,
    notifications: DEFAULT_NOTIFICATIONS,
    offline: true,
  };
}

export const GUEST_SESSION = guestSession();

export async function fetchSession(): Promise<SessionState> {
  try {
    const session = await request<Session>("session");
    return { ...session, offline: false };
  } catch (error) {
    if (error instanceof ApiError && error.isRateLimited) throw error;
    return guestSession();
  }
}

export function useSessionQuery() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    staleTime: 60_000,
    retry: false,
  });
}

export function useSession(): SessionState {
  const { data } = useSessionQuery();
  return data ?? GUEST_SESSION;
}

export function useViewer() {
  return useSession().anilist;
}

export function pickTitle(title: MediaTitle | null | undefined, preferred: boolean): string {
  if (!title) return "";
  if (preferred && title.userPreferred) return title.userPreferred;
  return title.english || title.romaji || title.userPreferred || title.native || "";
}

export function useTitle(): (title: MediaTitle | null | undefined) => string {
  const loggedIn = Boolean(useViewer());
  return useCallback((title) => pickTitle(title, loggedIn), [loggedIn]);
}

export function setSession(client: QueryClient, session: Session): void {
  client.setQueryData<SessionState>(SESSION_KEY, { ...session, offline: false });
}

export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: SettingsPayload) => request<Session>("settings", { body: payload }),
    onMutate: async (payload) => {
      await client.cancelQueries({ queryKey: SESSION_KEY });
      const previous = client.getQueryData<SessionState>(SESSION_KEY);
      if (previous) {
        client.setQueryData<SessionState>(SESSION_KEY, {
          ...previous,
          lang: payload.lang ?? previous.lang,
          notifications: { ...previous.notifications, ...payload.notifications },
        });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous && !context.previous.offline) client.setQueryData(SESSION_KEY, context.previous);
    },
    onSuccess: (session) => setSession(client, session),
    meta: { silent: !isTelegram() },
  });
}

export function useSetLang(): (lang: Lang) => void {
  const update = useUpdateSettings();
  return useCallback((lang: Lang) => update.mutate({ lang }), [update]);
}

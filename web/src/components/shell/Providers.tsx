"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { openLoginSheet } from "@/api/auth";
import { useSession, useSetLang } from "@/api/session";
import { dictionaries, I18nContext, type Dict, type I18nValue } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { Toaster } from "@/components/ui/Toaster";

const dictRef: { current: Dict } = { current: dictionaries.en };

function describe(error: unknown): string {
  const t = dictRef.current;
  if (error instanceof ApiError) {
    if (error.isRateLimited) return t.common.rateLimited;
    if (error.isAuth) return t.common.authRequired;
    if (error.isOffline) return t.common.offlineBody;
    if (error.code === "anilist_error" && error.detail) return error.detail;
  }
  return t.common.errorTitle;
}

function createClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ApiError && error.isRateLimited) toast.info(dictRef.current.common.rateLimited);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.silent) return;
        haptic.notify("error");
        if (error instanceof ApiError && error.isAuth) {
          openLoginSheet();
          return;
        }
        toast.error(describe(error));
      },
    }),
    defaultOptions: {
      queries: {
        retry: (count, error) => {
          if (error instanceof ApiError) {
            if (error.isRateLimited) return count < 3;
            if (error.isOffline || (error.status >= 400 && error.status < 500)) return false;
          }
          return count < 1;
        },
        retryDelay: (attempt, error) => (error instanceof ApiError && error.isRateLimited ? 4000 * (attempt + 1) : 1200),
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
      mutations: { retry: false },
    },
  });
}

function I18nProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const setLang = useSetLang();
  const value = useMemo<I18nValue>(() => ({ lang: session.lang, t: dictionaries[session.lang], setLang }), [session.lang, setLang]);

  useEffect(() => {
    dictRef.current = value.t;
    document.documentElement.lang = value.lang;
  }, [value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createClient);
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        {children}
        <Toaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}

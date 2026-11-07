import { useEffect, useMemo, type ReactNode } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig } from "motion/react";
import { ApiError } from "@/api/client";
import { openLoginSheet } from "@/api/auth";
import { useSession, useSetLang } from "@/api/session";
import { dictionaries, I18nContext, type Dict, type I18nValue } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";
import { toast } from "@/lib/toast";
import { ListIndexProvider } from "@/components/media/ListIndex";

let activeDict: Dict = dictionaries.en;

const loadMotionFeatures = () => import("./motionFeatures").then((module) => module.default);

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isRateLimited) return activeDict.common.rateLimited;
    if (error.isAuth) return activeDict.common.authRequired;
    if (error.isOffline) return activeDict.common.offlineBody;
    if (error.code === "anilist_error" && error.detail) return error.detail;
  }
  return activeDict.common.errorBody;
}

function createClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ApiError && error.isRateLimited) toast.info(activeDict.common.rateLimited);
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

export const queryClient = createClient();

function I18nProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const setLang = useSetLang();
  const value = useMemo<I18nValue>(() => ({ lang: session.lang, t: dictionaries[session.lang], setLang }), [session.lang, setLang]);

  useEffect(() => {
    activeDict = value.t;
    document.documentElement.lang = value.lang;
  }, [value]);

  activeDict = value.t;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          <I18nProvider>
            <ListIndexProvider>{children}</ListIndexProvider>
          </I18nProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}

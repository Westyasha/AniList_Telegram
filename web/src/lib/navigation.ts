"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { popBack, useBackStack } from "./back";
import { createStore } from "./store";
import { backButton, getStartParam, isTelegram } from "./telegram";

export const ROOT_PATHS = new Set(["/", "/search", "/schedule", "/library", "/me"]);

export function resolveStartParam(param: string | null): string | null {
  if (!param) return null;
  const [kind, ...rest] = param.split("_");
  const value = rest.join("_");
  switch (kind) {
    case "media":
    case "anime":
    case "manga":
      return /^\d+$/.test(value) ? `/media/${value}` : null;
    case "char":
    case "character":
      return /^\d+$/.test(value) ? `/character/${value}` : null;
    case "staff":
      return /^\d+$/.test(value) ? `/staff/${value}` : null;
    case "user":
      return /^[A-Za-z0-9_-]{1,40}$/.test(value) ? `/user/${encodeURIComponent(value)}` : null;
    case "list":
      return `/library?type=${value === "manga" ? "manga" : "anime"}`;
    case "schedule":
      return "/schedule";
    case "search":
      return value ? `/search?q=${encodeURIComponent(value)}` : "/search";
    case "notifications":
      return "/notifications";
    case "settings":
      return "/settings";
    case "me":
    case "profile":
      return "/me";
    default:
      return null;
  }
}

const trail = createStore<string[]>([]);
let deepLinkHandled = false;
let pendingReplace: string | null = null;

function record(path: string): void {
  if (pendingReplace !== null) {
    if (path.split("?")[0] !== pendingReplace.split("?")[0]) return;
    pendingReplace = null;
    trail.set([path]);
    return;
  }
  trail.set((prev) => {
    if (prev[prev.length - 1] === path) return prev;
    if (prev[prev.length - 2] === path) return prev.slice(0, -1);
    return [...prev, path];
  });
}

export function useNavigationTrail(): void {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (deepLinkHandled) return;
    deepLinkHandled = true;
    if (pathname !== "/") return;
    const target = resolveStartParam(getStartParam());
    if (!target) return;
    pendingReplace = target;
    router.replace(target);
  }, [pathname, router]);

  useEffect(() => {
    record(pathname);
  }, [pathname]);
}

export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (popBack()) return;
    if (trail.get().length > 1) router.back();
    else router.replace("/");
  }, [router]);
}

export function useIsRoot(): boolean {
  return ROOT_PATHS.has(usePathname());
}

export function useTelegramBackButton(): void {
  const isRoot = useIsRoot();
  const stack = useBackStack();
  const goBack = useGoBack();
  const visible = !isRoot || stack.length > 0;

  useEffect(() => {
    if (!isTelegram()) return;
    if (visible) backButton.show();
    else backButton.hide();
  }, [visible]);

  useEffect(() => {
    if (!isTelegram()) return;
    return backButton.onClick(goBack);
  }, [goBack]);
}

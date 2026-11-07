import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { popBack, useBackStack } from "@/lib/back";
import { backButton, getStartParam, isTelegram } from "@/lib/telegram";
import { ROOT_PATHS } from "./TabBar";

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
      return value ? `/user/${encodeURIComponent(value)}` : null;
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

export function useDeepLink(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    if (location.pathname !== "/") return;
    const target = resolveStartParam(getStartParam());
    if (target) navigate(target);
  }, [location.pathname, navigate]);
}

export function useGoBack(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (popBack()) return;
    const state = window.history.state as { idx?: number } | null;
    if (state?.idx && state.idx > 0) navigate(-1);
    else navigate("/", { replace: true });
  }, [navigate]);
}

export function useIsRoot(): boolean {
  return ROOT_PATHS.has(useLocation().pathname);
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

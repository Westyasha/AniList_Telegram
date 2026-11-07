type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationKind = "error" | "success" | "warning";
type InlineChatType = "users" | "bots" | "groups" | "channels";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface BackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

interface HapticFeedback {
  impactOccurred(style: ImpactStyle): void;
  notificationOccurred(type: NotificationKind): void;
  selectionChanged(): void;
}

interface WebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser; start_param?: string };
  colorScheme?: "light" | "dark";
  version: string;
  platform: string;
  isExpanded: boolean;
  BackButton: BackButton;
  HapticFeedback: HapticFeedback;
  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  disableVerticalSwipes?(): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  switchInlineQuery(query: string, chatTypes?: InlineChatType[]): void;
  showConfirm(message: string, callback: (ok: boolean) => void): void;
  onEvent?(event: "themeChanged", callback: () => void): void;
  offEvent?(event: "themeChanged", callback: () => void): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

const BRAND_BG = "#0B0B0D";

function webApp(): WebApp | undefined {
  return typeof window === "undefined" ? undefined : window.Telegram?.WebApp;
}

function supports(version: string): boolean {
  const app = webApp();
  return Boolean(app && app.initData && app.isVersionAtLeast(version));
}

function safely(run: () => void): void {
  try {
    run();
  } catch {
    return;
  }
}

export function isTelegram(): boolean {
  return Boolean(webApp()?.initData);
}

export function getInitData(): string {
  return webApp()?.initData ?? "";
}

export function getStartParam(): string | null {
  if (typeof window === "undefined") return null;
  const fromSdk = webApp()?.initDataUnsafe.start_param;
  if (fromSdk) return fromSdk;
  const params = new URLSearchParams(window.location.search);
  return params.get("tgWebAppStartParam") ?? params.get("startapp");
}

export function getTelegramUser(): TelegramUser | null {
  return webApp()?.initDataUnsafe.user ?? null;
}

export function setChromeColor(color: string): void {
  const app = webApp();
  if (!app) return;
  if (supports("6.9")) {
    safely(() => app.setHeaderColor(color));
    safely(() => app.setBackgroundColor(color));
  }
  if (supports("7.10") && app.setBottomBarColor) {
    safely(() => app.setBottomBarColor?.(color));
  }
}

export function onTelegramThemeChange(callback: () => void): () => void {
  const app = webApp();
  if (!app?.onEvent) return () => undefined;
  app.onEvent("themeChanged", callback);
  return () => app.offEvent?.("themeChanged", callback);
}

export function setupTelegram(): void {
  const app = webApp();
  if (!app) return;
  safely(() => app.ready());
  safely(() => app.expand());
  setChromeColor(BRAND_BG);
  if (supports("7.7") && app.disableVerticalSwipes) {
    safely(() => app.disableVerticalSwipes?.());
  }
}

export const haptic = {
  selection(): void {
    if (supports("6.1")) safely(() => webApp()?.HapticFeedback.selectionChanged());
  },
  impact(style: ImpactStyle = "light"): void {
    if (supports("6.1")) safely(() => webApp()?.HapticFeedback.impactOccurred(style));
  },
  notify(kind: NotificationKind): void {
    if (supports("6.1")) safely(() => webApp()?.HapticFeedback.notificationOccurred(kind));
  },
};

export const backButton = {
  available(): boolean {
    return supports("6.1");
  },
  show(): void {
    if (supports("6.1")) safely(() => webApp()?.BackButton.show());
  },
  hide(): void {
    if (supports("6.1")) safely(() => webApp()?.BackButton.hide());
  },
  onClick(cb: () => void): () => void {
    const app = webApp();
    if (!app || !supports("6.1")) return () => undefined;
    app.BackButton.onClick(cb);
    return () => safely(() => app.BackButton.offClick(cb));
  },
};

export function openExternal(url: string): void {
  const app = webApp();
  if (app?.initData) {
    safely(() => app.openLink(url));
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openTelegram(url: string): void {
  const app = webApp();
  if (app?.initData) {
    safely(() => app.openTelegramLink(url));
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function shareInline(query: string): boolean {
  if (!supports("6.7")) return false;
  try {
    webApp()?.switchInlineQuery(query, ["users", "groups", "channels"]);
    return true;
  } catch {
    return false;
  }
}

export function confirmAction(message: string): Promise<boolean> {
  const app = webApp();
  if (app && supports("6.2")) {
    return new Promise((resolve) => {
      try {
        app.showConfirm(message, (ok) => resolve(ok));
      } catch {
        resolve(window.confirm(message));
      }
    });
  }
  return Promise.resolve(window.confirm(message));
}

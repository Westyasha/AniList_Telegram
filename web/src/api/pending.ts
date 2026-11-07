import type { Lang } from "./types";

export interface PendingLogin {
  anilist: { name: string; avatar: string | null };
  telegram: { name: string; username: string | null };
  lang: Lang;
  expires_in: number;
}

export type ConfirmAction = "confirm" | "cancel";

export type ConfirmResult = { status: "ok"; name: string } | { status: "cancelled" } | { status: "error"; reason: "expired" | "exchange" | "rate" | "network" };

export type PendingResult = { kind: "ok"; data: PendingLogin } | { kind: "expired" } | { kind: "rate" } | { kind: "network" };

const TOKEN = /^[A-Za-z0-9_-]{8,256}$/;
const BOT = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;
const FALLBACK_BOT = "westyasha_AniList_bot";

export function isToken(value: string | null | undefined): value is string {
  return typeof value === "string" && TOKEN.test(value);
}

export function botLink(username: string | null | undefined): string {
  const name = username && BOT.test(username) ? username : FALLBACK_BOT;
  return `https://t.me/${name}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, max = 128): string | null {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;
}

export function safeAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "s4.anilist.co" || url.hostname === "img.anili.st") ? url.toString() : null;
  } catch {
    return null;
  }
}

function parsePending(value: unknown): PendingLogin | null {
  if (!isRecord(value) || !isRecord(value.anilist) || !isRecord(value.telegram)) return null;
  const anilistName = text(value.anilist.name, 64);
  const telegramName = text(value.telegram.name, 128);
  if (!anilistName || !telegramName) return null;
  return {
    anilist: { name: anilistName, avatar: safeAvatar(value.anilist.avatar) },
    telegram: { name: telegramName, username: text(value.telegram.username, 64) },
    lang: value.lang === "ru" ? "ru" : "en",
    expires_in: typeof value.expires_in === "number" && Number.isFinite(value.expires_in) ? Math.max(0, Math.floor(value.expires_in)) : 0,
  };
}

const NO_STORE: RequestInit = { cache: "no-store", credentials: "same-origin", referrerPolicy: "no-referrer" };

export async function fetchPending(nonce: string, signal?: AbortSignal): Promise<PendingResult> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/pending?nonce=${encodeURIComponent(nonce)}`, { ...NO_STORE, headers: { Accept: "application/json" }, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { kind: "network" };
  }
  if (response.status === 404 || response.status === 410) return { kind: "expired" };
  if (response.status === 429) return { kind: "rate" };
  if (!response.ok) return { kind: "network" };
  const data = parsePending(await response.json().catch(() => null));
  return data ? { kind: "ok", data } : { kind: "network" };
}

export async function sendConfirm(nonce: string, csrf: string, action: ConfirmAction): Promise<ConfirmResult> {
  let response: Response;
  try {
    response = await fetch("/api/auth/confirm", {
      ...NO_STORE,
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ nonce, csrf, action }),
    });
  } catch {
    return { status: "error", reason: "network" };
  }
  const body: unknown = await response.json().catch(() => null);
  if (response.status === 429) return { status: "error", reason: "rate" };
  if (!response.ok) {
    const code = isRecord(body) ? body.error : null;
    return { status: "error", reason: code === "exchange" ? "exchange" : code === "expired" || response.status === 404 ? "expired" : "network" };
  }
  if (isRecord(body) && body.status === "cancelled") return { status: "cancelled" };
  if (isRecord(body) && body.status === "ok") {
    const name = isRecord(body.anilist) ? text(body.anilist.name, 64) : null;
    return { status: "ok", name: name ?? "AniList" };
  }
  return { status: "error", reason: "network" };
}

export async function fetchBotUsername(): Promise<string | null> {
  try {
    const response = await fetch("/api/session", { ...NO_STORE, headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const body: unknown = await response.json().catch(() => null);
    return isRecord(body) && typeof body.bot_username === "string" && BOT.test(body.bot_username) ? body.bot_username : null;
  } catch {
    return null;
  }
}

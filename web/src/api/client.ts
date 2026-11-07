import { getInitData } from "@/lib/telegram";
import type { OperationName, OpData, OpVariables } from "./types";

export type ApiErrorCode =
  | "auth_required"
  | "rate_limited"
  | "unknown_operation"
  | "anilist_error"
  | "network"
  | "bad_response"
  | "http";

export class ApiError extends Error {
  readonly code: ApiErrorCode | string;
  readonly status: number;
  readonly detail: string | null;

  constructor(code: ApiErrorCode | string, status: number, detail: string | null = null) {
    super(detail ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }

  get isAuth(): boolean {
    return this.code === "auth_required" || this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.code === "rate_limited" || this.status === 429;
  }

  get isOffline(): boolean {
    return this.code === "network" || this.code === "bad_response";
  }
}

interface ErrorBody {
  error?: string;
  message?: string;
}

function isErrorBody(value: unknown): value is ErrorBody {
  return typeof value === "object" && value !== null && ("error" in value || "message" in value);
}

let initDataRejected = false;

export function isInitDataRejected(): boolean {
  return initDataRejected;
}

function buildHeaders(hasBody: boolean): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (hasBody) headers.set("Content-Type", "application/json");
  const initData = initDataRejected ? "" : getInitData();
  if (initData) headers.set("Authorization", `tma ${initData}`);
  return headers;
}

export async function request<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: init.method ?? (hasBody ? "POST" : "GET"),
      headers: buildHeaders(hasBody),
      body: hasBody ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      credentials: "same-origin",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("network", 0);
  }

  const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
  const payload: unknown = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && isErrorBody(payload) && payload.error === "bad_init_data" && !initDataRejected) {
      initDataRejected = true;
      return request<T>(path, init);
    }
    if (isErrorBody(payload)) {
      throw new ApiError(payload.error ?? "http", response.status, payload.message ?? null);
    }
    throw new ApiError(response.status === 404 && !isJson ? "bad_response" : "http", response.status);
  }

  if (!isJson || payload === null) throw new ApiError("bad_response", response.status);
  return payload as T;
}

function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      const cleaned = inner && typeof inner === "object" && !Array.isArray(inner) ? inner : compact(inner);
      if (cleaned !== undefined && cleaned !== null && cleaned !== "") out[key] = cleaned;
    }
    return out;
  }
  return value;
}

export async function gql<K extends OperationName>(
  op: K,
  variables?: OpVariables<K>,
  options: { signal?: AbortSignal; raw?: boolean } = {},
): Promise<OpData<K>> {
  const prepared = variables ? (options.raw ? variables : compact(variables)) : {};
  const body = { op, variables: prepared };
  const signal = options.signal;
  const result = await request<{ data: OpData<K> | null }>("gql", { body, signal });
  if (!result.data) throw new ApiError("bad_response", 200);
  return result.data;
}

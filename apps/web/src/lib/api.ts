/**
 * API 客户端：封装 fetch，自动注入 JWT，处理 401 刷新
 */

const API_BASE = "/api/server";

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  traceId?: string;
  timestamp: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function setToken(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
}

export const tokenStorage = {
  getAccess: () => getToken("atm_access_token"),
  getRefresh: () => getToken("atm_refresh_token"),
  setAccess: (v: string | null) => setToken("atm_access_token", v),
  setRefresh: (v: string | null) => setToken("atm_refresh_token", v),
  clear: () => {
    setToken("atm_access_token", null);
    setToken("atm_refresh_token", null);
  },
};

let isRefreshing = false;
let onAuthError: (() => void) | null = null;

export function setAuthErrorHandler(handler: () => void) {
  onAuthError = handler;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json: ApiResponse<{ accessToken: string; refreshToken: string }> =
      await res.json();
    if (json.success && json.data) {
      tokenStorage.setAccess(json.data.accessToken);
      tokenStorage.setRefresh(json.data.refreshToken);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = tokenStorage.getAccess();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // 401 时尝试刷新 token
  if (res.status === 401 && !isRefreshing) {
    isRefreshing = true;
    const refreshed = await refreshAccessToken();
    isRefreshing = false;

    if (refreshed) {
      const newToken = tokenStorage.getAccess();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
      }
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      tokenStorage.clear();
      onAuthError?.();
      throw new ApiError("AUTH_TOKEN_EXPIRED", "登录已过期，请重新登录", 401);
    }
  }

  const json: ApiResponse<T> = await res.json();

  if (!json.success || json.error) {
    throw new ApiError(
      json.error?.code ?? "UNKNOWN",
      json.error?.message ?? "请求失败",
      res.status,
    );
  }

  return json.data as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),
};

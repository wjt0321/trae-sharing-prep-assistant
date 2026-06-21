/**
 * API 客户端：封装 fetch，通过 httpOnly Cookie 自动携带 JWT，处理 401 刷新
 *
 * 安全设计（参考 13_代码审查与安全加固迭代计划.md §1.4）：
 * - Token 存储在 httpOnly Cookie 中，前端无法通过 JS 读取（防 XSS）
 * - 所有请求携带 credentials: 'include'，Cookie 自动发送
 * - 401 时自动调用 /auth/refresh 刷新（refresh token 也在 Cookie 中）
 *
 * 类型安全（参考 13_代码审查与安全加固迭代计划.md §3.2）：
 * - 响应数据结构运行时校验（isApiResponse 守卫）
 * - 非法结构抛出明确错误，避免 `as T` 静默掩盖问题
 */

const API_BASE = "/api/server";

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  traceId?: string;
  timestamp: string;
}

/**
 * 运行时类型守卫：校验响应是否符合 ApiResponse 结构
 * 防止后端返回非预期结构时，`as T` 静默掩盖问题
 */
function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.success === "boolean" &&
    (obj.data === null || typeof obj.data !== "undefined") &&
    (obj.error === null ||
      (typeof obj.error === "object" &&
        typeof (obj.error as Record<string, unknown>)?.code === "string" &&
        typeof (obj.error as Record<string, unknown>)?.message === "string"))
  );
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

let isRefreshing = false;
let onAuthError: (() => void) | null = null;

export function setAuthErrorHandler(handler: () => void) {
  onAuthError = handler;
}

/**
 * 刷新 access token（refresh token 从 httpOnly Cookie 自动携带）
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const json: unknown = await res.json();
    if (!isApiResponse(json)) return false;
    return json.success === true;
  } catch {
    return false;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // 请求超时：15 秒无响应自动中断，避免前端长时间挂起
  const timeoutSignal = AbortSignal.timeout(15_000);
  const combinedSignal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
    signal: combinedSignal,
  });

  // 401 时尝试刷新 token（refresh token 从 Cookie 自动携带）
  if (res.status === 401 && !isRefreshing) {
    isRefreshing = true;
    const refreshed = await refreshAccessToken();
    isRefreshing = false;

    if (refreshed) {
      // Cookie 已由刷新接口更新，直接重试原请求
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
        signal: combinedSignal,
      });
    } else {
      onAuthError?.();
      throw new ApiError("AUTH_TOKEN_EXPIRED", "登录已过期，请重新登录", 401);
    }
  }

  const raw: unknown = await res.json();

  // 运行时校验响应结构，防止非预期格式静默通过
  if (!isApiResponse(raw)) {
    throw new ApiError(
      "INVALID_RESPONSE_FORMAT",
      "服务器返回了非预期的响应格式",
      res.status,
    );
  }

  const json = raw as ApiResponse<T>;

  if (!json.success || json.error) {
    throw new ApiError(
      json.error?.code ?? "UNKNOWN",
      json.error?.message ?? "请求失败",
      res.status,
      json.error?.details,
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
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
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

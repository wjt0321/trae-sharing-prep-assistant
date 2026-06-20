/**
 * 统一 API 响应结构
 * 参考：01_产品骨架与仓库迁移实施清单.md（统一错误码和响应结构）
 */

export interface ApiResponse<T = unknown> {
  /** 业务是否成功 */
  success: boolean;
  /** 业务数据 */
  data: T | null;
  /** 错误信息（success=false 时存在） */
  error: ApiErrorPayload | null;
  /** 请求追踪 ID */
  traceId?: string;
  /** 服务端时间戳（ISO 8601） */
  timestamp: string;
}

export interface ApiErrorPayload {
  /** 错误码 */
  code: string;
  /** 面向用户的错误消息 */
  message: string;
  /** 面向开发者的详细信息 */
  details?: unknown;
  /** 字段级错误（表单校验场景） */
  fieldErrors?: Record<string, string[]>;
}

/** 构造成功响应 */
export function ok<T>(data: T, traceId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    traceId,
    timestamp: new Date().toISOString(),
  };
}

/** 构造失败响应 */
export function fail(
  error: ApiErrorPayload,
  traceId?: string,
): ApiResponse<never> {
  return {
    success: false,
    data: null,
    error,
    traceId,
    timestamp: new Date().toISOString(),
  };
}

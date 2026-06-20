/**
 * API 错误类
 * 参考：11_后端平台数据层与AI基础设施实施清单.md（错误对象）
 */
import type { ErrorCodeDefinition } from './error-codes.js';
import type { ApiErrorPayload } from '../dto/api-response.dto.js';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    definition: ErrorCodeDefinition,
    options?: {
      message?: string;
      details?: unknown;
      fieldErrors?: Record<string, string[]>;
      cause?: unknown;
    },
  ) {
    super(options?.message ?? definition.message, { cause: options?.cause });
    this.name = 'ApiError';
    this.code = definition.code;
    this.status = definition.status;
    if (options?.details !== undefined) this.details = options.details;
    if (options?.fieldErrors !== undefined) this.fieldErrors = options.fieldErrors;
  }

  toPayload(): ApiErrorPayload {
    const payload: ApiErrorPayload = {
      code: this.code,
      message: this.message,
    };
    if (this.details !== undefined) payload.details = this.details;
    if (this.fieldErrors !== undefined) payload.fieldErrors = this.fieldErrors;
    return payload;
  }

  static fromCode(
    code: string,
    status: number,
    message: string,
    options?: { details?: unknown; fieldErrors?: Record<string, string[]> },
  ): ApiError {
    return new ApiError({ code, status, message }, options);
  }
}

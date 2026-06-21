/**
 * 错误码映射测试
 * 验证 ErrorCode → HTTP 状态码映射完整
 */
import { describe, it, expect } from 'vitest';
import { ErrorCode } from './error-codes.js';
import { ApiError } from './api-error.js';

describe('ErrorCode 完整性', () => {
  it('每个错误码都有 code/status/message 三个字段', () => {
    for (const [key, def] of Object.entries(ErrorCode)) {
      expect(def.code).toBeDefined();
      expect(typeof def.code).toBe('string');
      expect(def.code.length).toBeGreaterThan(0);
      expect(def.status).toBeDefined();
      expect(typeof def.status).toBe('number');
      expect(def.message).toBeDefined();
      expect(typeof def.message).toBe('string');
      expect(def.message.length).toBeGreaterThan(0);
    }
  });

  it('所有 code 值唯一', () => {
    const codes = Object.values(ErrorCode).map((e) => e.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('所有 status 值为有效 HTTP 状态码（400-599）', () => {
    for (const def of Object.values(ErrorCode)) {
      expect(def.status).toBeGreaterThanOrEqual(400);
      expect(def.status).toBeLessThanOrEqual(599);
    }
  });

  it('错误码 key 与 code 值一致', () => {
    // 约定：ErrorCode 的 key 应与 code 字段值相同
    for (const [key, def] of Object.entries(ErrorCode)) {
      expect(key).toBe(def.code);
    }
  });
});

describe('ErrorCode 分类验证', () => {
  it('通用错误码（1xxx 段）状态码正确', () => {
    expect(ErrorCode.INTERNAL_ERROR.status).toBe(500);
    expect(ErrorCode.BAD_REQUEST.status).toBe(400);
    expect(ErrorCode.UNAUTHORIZED.status).toBe(401);
    expect(ErrorCode.FORBIDDEN.status).toBe(403);
    expect(ErrorCode.NOT_FOUND.status).toBe(404);
    expect(ErrorCode.CONFLICT.status).toBe(409);
    expect(ErrorCode.VALIDATION_FAILED.status).toBe(422);
    expect(ErrorCode.RATE_LIMITED.status).toBe(429);
  });

  it('认证错误码状态码正确', () => {
    expect(ErrorCode.AUTH_INVALID_CREDENTIALS.status).toBe(401);
    expect(ErrorCode.AUTH_TOKEN_EXPIRED.status).toBe(401);
    expect(ErrorCode.AUTH_TOKEN_INVALID.status).toBe(401);
    expect(ErrorCode.AUTH_EMAIL_ALREADY_USED.status).toBe(409);
    expect(ErrorCode.AUTH_ACCOUNT_LOCKED.status).toBe(423);
  });

  it('AI 网关错误码状态码正确', () => {
    expect(ErrorCode.AI_GATEWAY_UNAVAILABLE.status).toBe(503);
    expect(ErrorCode.AI_GATEWAY_TIMEOUT.status).toBe(504);
    expect(ErrorCode.AI_GATEWAY_RATE_LIMITED.status).toBe(429);
  });

  it('资源不存在类错误码统一返回 404', () => {
    expect(ErrorCode.WORKSPACE_NOT_FOUND.status).toBe(404);
    expect(ErrorCode.GOAL_NOT_FOUND.status).toBe(404);
    expect(ErrorCode.PLAN_NOT_FOUND.status).toBe(404);
    expect(ErrorCode.EXECUTION_TASK_NOT_FOUND.status).toBe(404);
    expect(ErrorCode.KNOWLEDGE_ASSET_NOT_FOUND.status).toBe(404);
    expect(ErrorCode.TASK_JOB_NOT_FOUND.status).toBe(404);
    expect(ErrorCode.AUDIT_LOG_NOT_FOUND.status).toBe(404);
  });
});

describe('ApiError', () => {
  it('使用 ErrorCode 定义构造错误对象', () => {
    const error = new ApiError(ErrorCode.NOT_FOUND);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
    expect(error.message).toBe('资源不存在');
    expect(error.name).toBe('ApiError');
    expect(error).toBeInstanceOf(Error);
  });

  it('支持自定义 message', () => {
    const error = new ApiError(ErrorCode.BAD_REQUEST, {
      message: '邮箱格式不正确',
    });
    expect(error.message).toBe('邮箱格式不正确');
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('支持 details 字段', () => {
    const error = new ApiError(ErrorCode.VALIDATION_FAILED, {
      details: { field: 'email', reason: 'invalid format' },
    });
    expect(error.details).toEqual({ field: 'email', reason: 'invalid format' });
  });

  it('支持 fieldErrors 字段', () => {
    const error = new ApiError(ErrorCode.VALIDATION_FAILED, {
      fieldErrors: { email: ['邮箱格式不正确', '邮箱不能为空'] },
    });
    expect(error.fieldErrors).toEqual({
      email: ['邮箱格式不正确', '邮箱不能为空'],
    });
  });

  it('toPayload() 返回正确的错误负载结构', () => {
    const error = new ApiError(ErrorCode.NOT_FOUND, {
      details: { id: '123' },
    });
    const payload = error.toPayload();
    expect(payload).toEqual({
      code: 'NOT_FOUND',
      message: '资源不存在',
      details: { id: '123' },
    });
  });

  it('toPayload() 不包含 undefined 字段', () => {
    const error = new ApiError(ErrorCode.NOT_FOUND);
    const payload = error.toPayload();
    expect(payload).not.toHaveProperty('details');
    expect(payload).not.toHaveProperty('fieldErrors');
    expect(payload).toEqual({
      code: 'NOT_FOUND',
      message: '资源不存在',
    });
  });

  it('fromCode() 静态方法正确构造错误对象', () => {
    const error = ApiError.fromCode('CUSTOM_ERROR', 400, '自定义错误');
    expect(error.code).toBe('CUSTOM_ERROR');
    expect(error.status).toBe(400);
    expect(error.message).toBe('自定义错误');
  });
});

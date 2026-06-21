/**
 * API 响应结构测试
 * 验证 ok() / fail() 函数返回正确的 ApiResponse 结构
 */
import { describe, it, expect } from 'vitest';
import { ok, fail } from './api-response.dto.js';

describe('ok() 成功响应构造', () => {
  it('返回 success=true 的响应结构', () => {
    const response = ok({ id: 1, name: 'test' });
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ id: 1, name: 'test' });
    expect(response.error).toBeNull();
  });

  it('包含 ISO 8601 时间戳', () => {
    const response = ok('hello');
    expect(response.timestamp).toBeDefined();
    expect(() => new Date(response.timestamp).toISOString()).not.toThrow();
  });

  it('支持可选的 traceId', () => {
    const response = ok(null, 'trace-abc-123');
    expect(response.traceId).toBe('trace-abc-123');
  });

  it('支持泛型数据类型', () => {
    const stringResponse = ok('string data');
    expect(stringResponse.data).toBe('string data');

    const arrayResponse = ok([1, 2, 3]);
    expect(arrayResponse.data).toEqual([1, 2, 3]);

    const nullResponse = ok(null);
    expect(nullResponse.data).toBeNull();
  });
});

describe('fail() 失败响应构造', () => {
  it('返回 success=false 的响应结构', () => {
    const response = fail({
      code: 'NOT_FOUND',
      message: '资源不存在',
    });
    expect(response.success).toBe(false);
    expect(response.data).toBeNull();
    expect(response.error).toEqual({
      code: 'NOT_FOUND',
      message: '资源不存在',
    });
  });

  it('包含 ISO 8601 时间戳', () => {
    const response = fail({ code: 'ERROR', message: '出错' });
    expect(response.timestamp).toBeDefined();
    expect(() => new Date(response.timestamp).toISOString()).not.toThrow();
  });

  it('支持可选的 traceId', () => {
    const response = fail(
      { code: 'ERROR', message: '出错' },
      'trace-xyz-789',
    );
    expect(response.traceId).toBe('trace-xyz-789');
  });

  it('支持 details 和 fieldErrors', () => {
    const response = fail({
      code: 'VALIDATION_FAILED',
      message: '校验失败',
      details: { field: 'email' },
      fieldErrors: { email: ['格式不正确'] },
    });
    expect(response.error?.details).toEqual({ field: 'email' });
    expect(response.error?.fieldErrors).toEqual({ email: ['格式不正确'] });
  });
});

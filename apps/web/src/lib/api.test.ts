/**
 * API 客户端测试
 * 验证 apiFetch 的请求构造、401 刷新、错误处理
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, apiFetch, ApiError, setAuthErrorHandler } from './api';

// Mock global.fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock AbortSignal.timeout 和 AbortSignal.any（jsdom 可能不支持）
if (!AbortSignal.timeout) {
  AbortSignal.timeout = vi.fn().mockReturnValue(new AbortController().signal);
}
if (!AbortSignal.any) {
  AbortSignal.any = vi.fn().mockReturnValue(new AbortController().signal);
}

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  } as Response;
}

describe('apiFetch()', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('成功请求返回 data', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: { id: 1, name: 'test' },
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    const result = await apiFetch<{ id: number; name: string }>('/goals');
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('请求携带 credentials: include', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: null,
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    await apiFetch('/test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('请求携带 Content-Type: application/json', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: null,
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    await apiFetch('/test');
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers['Content-Type']).toBe('application/json');
  });

  it('success=false 时抛出 ApiError', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: '资源不存在' },
        timestamp: new Date().toISOString(),
      }, 404),
    );

    try {
      await apiFetch('/test');
      expect.fail('应该抛出 ApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('资源不存在');
      expect(err.status).toBe(404);
    }
  });

  it('响应格式无效时抛出 INVALID_RESPONSE_FORMAT', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ invalid: 'not an api response' }),
    );

    try {
      await apiFetch('/test');
      expect.fail('应该抛出 ApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.code).toBe('INVALID_RESPONSE_FORMAT');
    }
  });

  it('401 时尝试刷新 token', async () => {
    // 第一次请求返回 401
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: false,
        data: null,
        error: { code: 'AUTH_TOKEN_EXPIRED', message: '登录已过期' },
        timestamp: new Date().toISOString(),
      }, 401),
    );
    // 刷新 token 请求成功
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: null,
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );
    // 重试原请求成功
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: { retried: true },
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    const result = await apiFetch<{ retried: boolean }>('/test');
    expect(result.retried).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3); // 原请求 + 刷新 + 重试
  });

  it('401 刷新失败时调用 authErrorHandler 并抛出错误', async () => {
    const errorHandler = vi.fn();
    setAuthErrorHandler(errorHandler);

    // 第一次请求返回 401
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: false,
        data: null,
        error: { code: 'AUTH_TOKEN_EXPIRED', message: '登录已过期' },
        timestamp: new Date().toISOString(),
      }, 401),
    );
    // 刷新 token 请求失败
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: false,
        data: null,
        error: { code: 'AUTH_TOKEN_INVALID', message: '无效' },
        timestamp: new Date().toISOString(),
      }, 401),
    );

    await expect(apiFetch('/test')).rejects.toThrow(ApiError);
    expect(errorHandler).toHaveBeenCalled();
  });
});

describe('api 对象方法', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('get() 发送 GET 请求', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: 'ok',
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    await api.get('/test');
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.method).toBeUndefined(); // GET 是默认方法
  });

  it('post() 发送 POST 请求并携带 body', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: 'ok',
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    await api.post('/test', { name: 'test' });
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.method).toBe('POST');
    expect(callArgs.body).toBe(JSON.stringify({ name: 'test' }));
  });

  it('put() 发送 PUT 请求', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: 'ok',
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    await api.put('/test', { name: 'updated' });
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.method).toBe('PUT');
  });

  it('patch() 发送 PATCH 请求', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: 'ok',
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    await api.patch('/test', { name: 'patched' });
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.method).toBe('PATCH');
  });

  it('delete() 发送 DELETE 请求', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: 'ok',
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    await api.delete('/test');
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.method).toBe('DELETE');
  });

  it('post() 无 body 时不携带 body', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: 'ok',
        error: null,
        timestamp: new Date().toISOString(),
      }),
    );

    await api.post('/test');
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.body).toBeUndefined();
  });
});

describe('ApiError', () => {
  it('正确设置 code、message、status', () => {
    const error = new ApiError('TEST_ERROR', '测试错误', 400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('测试错误');
    expect(error.status).toBe(400);
    expect(error).toBeInstanceOf(Error);
  });

  it('支持 details 字段', () => {
    const error = new ApiError('TEST', '错误', 400, { field: 'email' });
    expect(error.details).toEqual({ field: 'email' });
  });

  it('无 details 时不设置该字段', () => {
    const error = new ApiError('TEST', '错误', 400);
    expect(error.details).toBeUndefined();
  });
});

/**
 * 分页工具函数测试
 * 验证 normalizePagination() 的边界处理和默认值
 */
import { describe, it, expect } from 'vitest';
import { normalizePagination } from './pagination.dto.js';

describe('normalizePagination()', () => {
  it('空输入返回默认值（page=1, pageSize=20）', () => {
    const result = normalizePagination({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('正确计算 skip 和 take', () => {
    const result = normalizePagination({ page: 3, pageSize: 10 });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
    expect(result.skip).toBe(20); // (3-1) * 10
    expect(result.take).toBe(10);
  });

  it('page 小于 1 时强制为 1', () => {
    expect(normalizePagination({ page: 0 }).page).toBe(1);
    expect(normalizePagination({ page: -5 }).page).toBe(1);
  });

  it('pageSize 小于 1 时强制为 1', () => {
    expect(normalizePagination({ pageSize: 0 }).pageSize).toBe(1);
    expect(normalizePagination({ pageSize: -10 }).pageSize).toBe(1);
  });

  it('pageSize 超过 100 时强制为 100', () => {
    expect(normalizePagination({ pageSize: 101 }).pageSize).toBe(100);
    expect(normalizePagination({ pageSize: 1000 }).pageSize).toBe(100);
  });

  it('pageSize 等于 100 时保持不变（边界值）', () => {
    expect(normalizePagination({ pageSize: 100 }).pageSize).toBe(100);
  });

  it('page 等于 1 时保持不变（边界值）', () => {
    expect(normalizePagination({ page: 1 }).page).toBe(1);
  });

  it('skip 始终为 (page-1) * pageSize', () => {
    const cases = [
      { page: 1, pageSize: 20, expectedSkip: 0 },
      { page: 2, pageSize: 20, expectedSkip: 20 },
      { page: 5, pageSize: 10, expectedSkip: 40 },
      { page: 10, pageSize: 50, expectedSkip: 450 },
    ];
    for (const { page, pageSize, expectedSkip } of cases) {
      const result = normalizePagination({ page, pageSize });
      expect(result.skip).toBe(expectedSkip);
    }
  });
});

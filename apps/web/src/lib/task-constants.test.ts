/**
 * 任务状态样式映射测试
 * 验证 STATUS_STYLE_MAP 和 STATUS_DOT_STYLE_MAP 覆盖所有状态
 */
import { describe, it, expect } from 'vitest';
import { STATUS_STYLE_MAP, STATUS_DOT_STYLE_MAP } from './task-constants';
import { TaskStatusEnum } from '@ai-task-manager/shared';

describe('STATUS_STYLE_MAP', () => {
  it('覆盖所有 TaskStatusEnum 值', () => {
    for (const status of Object.values(TaskStatusEnum)) {
      expect(STATUS_STYLE_MAP[status]).toBeDefined();
      expect(typeof STATUS_STYLE_MAP[status]).toBe('string');
      expect(STATUS_STYLE_MAP[status].length).toBeGreaterThan(0);
    }
  });

  it('PENDING 使用 muted 样式', () => {
    expect(STATUS_STYLE_MAP[TaskStatusEnum.PENDING]).toContain('bg-muted');
  });

  it('IN_PROGRESS 使用 accent 样式', () => {
    expect(STATUS_STYLE_MAP[TaskStatusEnum.IN_PROGRESS]).toContain('accent');
  });

  it('COMPLETED 使用 success 样式', () => {
    expect(STATUS_STYLE_MAP[TaskStatusEnum.COMPLETED]).toContain('success');
  });

  it('BLOCKED 使用 danger 样式', () => {
    expect(STATUS_STYLE_MAP[TaskStatusEnum.BLOCKED]).toContain('danger');
  });
});

describe('STATUS_DOT_STYLE_MAP', () => {
  it('覆盖所有 TaskStatusEnum 值', () => {
    for (const status of Object.values(TaskStatusEnum)) {
      expect(STATUS_DOT_STYLE_MAP[status]).toBeDefined();
      expect(STATUS_DOT_STYLE_MAP[status]).toHaveProperty('border');
      expect(STATUS_DOT_STYLE_MAP[status]).toHaveProperty('bg');
    }
  });

  it('COMPLETED 有勾选图标', () => {
    expect(STATUS_DOT_STYLE_MAP[TaskStatusEnum.COMPLETED].icon).toBe('✓');
  });

  it('BLOCKED 有感叹号图标', () => {
    expect(STATUS_DOT_STYLE_MAP[TaskStatusEnum.BLOCKED].icon).toBe('!');
  });

  it('PENDING 和 CANCELLED 无图标', () => {
    expect(STATUS_DOT_STYLE_MAP[TaskStatusEnum.PENDING].icon).toBeUndefined();
    expect(STATUS_DOT_STYLE_MAP[TaskStatusEnum.CANCELLED].icon).toBeUndefined();
  });

  it('IN_PROGRESS 使用 accent 边框', () => {
    expect(STATUS_DOT_STYLE_MAP[TaskStatusEnum.IN_PROGRESS].border).toContain('accent');
  });

  it('COMPLETED 使用 success 边框', () => {
    expect(STATUS_DOT_STYLE_MAP[TaskStatusEnum.COMPLETED].border).toContain('success');
  });

  it('BLOCKED 使用 danger 边框', () => {
    expect(STATUS_DOT_STYLE_MAP[TaskStatusEnum.BLOCKED].border).toContain('danger');
  });
});

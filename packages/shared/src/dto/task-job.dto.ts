/**
 * 异步任务 DTO
 * 参考：11_后端平台数据层与AI基础设施实施清单.md（TaskJob 表 + 应用内 worker）
 */
import type { AiTaskStatusEnum, JobTypeEnum } from '../enums/index.js';

export interface TaskJobResponseDto {
  id: string;
  type: JobTypeEnum;
  status: AiTaskStatusEnum;
  /** 任务输入参数（JSON） */
  payload: Record<string, unknown>;
  /** 任务输出结果（JSON，成功后填充） */
  result: Record<string, unknown> | null;
  /** 错误信息（失败时填充） */
  errorMessage: string | null;
  /** 已重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 预定执行时间（ISO 8601） */
  scheduledAt: string;
  /** 开始执行时间 */
  startedAt: string | null;
  /** 结束时间 */
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskJobRequestDto {
  type: JobTypeEnum;
  payload: Record<string, unknown>;
  maxRetries?: number;
  scheduledAt?: string;
}

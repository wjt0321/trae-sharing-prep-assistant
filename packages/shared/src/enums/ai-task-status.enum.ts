/**
 * AI 异步任务状态枚举
 * 参考：01_产品骨架与仓库迁移实施清单.md（预留 AI 任务状态与异步任务状态枚举）
 * 参考：11_后端平台数据层与AI基础设施实施清单.md（本地任务调度）
 */
export enum AiTaskStatusEnum {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export const AI_TASK_STATUS_LABELS: Record<AiTaskStatusEnum, string> = {
  [AiTaskStatusEnum.QUEUED]: '排队中',
  [AiTaskStatusEnum.RUNNING]: '执行中',
  [AiTaskStatusEnum.SUCCEEDED]: '已成功',
  [AiTaskStatusEnum.FAILED]: '已失败',
  [AiTaskStatusEnum.CANCELLED]: '已取消',
  [AiTaskStatusEnum.TIMEOUT]: '已超时',
};

/** 终态：不再变化的状态 */
export const AI_TASK_TERMINAL_STATES: AiTaskStatusEnum[] = [
  AiTaskStatusEnum.SUCCEEDED,
  AiTaskStatusEnum.FAILED,
  AiTaskStatusEnum.CANCELLED,
  AiTaskStatusEnum.TIMEOUT,
];

export function isTerminalAiTaskStatus(status: AiTaskStatusEnum): boolean {
  return AI_TASK_TERMINAL_STATES.includes(status);
}

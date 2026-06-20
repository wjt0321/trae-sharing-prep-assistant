/**
 * 任务状态枚举（业务任务，如阶段任务、行动清单项）
 * 参考：05_执行工作台与推进系统实施清单.md
 */
export enum TaskStatusEnum {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped',
}

export const TASK_STATUS_LABELS: Record<TaskStatusEnum, string> = {
  [TaskStatusEnum.PENDING]: '待推进',
  [TaskStatusEnum.IN_PROGRESS]: '进行中',
  [TaskStatusEnum.COMPLETED]: '已完成',
  [TaskStatusEnum.CANCELLED]: '已取消',
  [TaskStatusEnum.BLOCKED]: '受阻',
  [TaskStatusEnum.SKIPPED]: '已跳过',
};

/**
 * 任务状态流转规则（状态机）
 * key 为当前状态，value 为允许流转到的下一个状态
 */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatusEnum, TaskStatusEnum[]> = {
  [TaskStatusEnum.PENDING]: [
    TaskStatusEnum.IN_PROGRESS,
    TaskStatusEnum.COMPLETED,
    TaskStatusEnum.BLOCKED,
    TaskStatusEnum.CANCELLED,
    TaskStatusEnum.SKIPPED,
  ],
  [TaskStatusEnum.IN_PROGRESS]: [
    TaskStatusEnum.COMPLETED,
    TaskStatusEnum.BLOCKED,
    TaskStatusEnum.PENDING,
    TaskStatusEnum.CANCELLED,
    TaskStatusEnum.SKIPPED,
  ],
  [TaskStatusEnum.BLOCKED]: [
    TaskStatusEnum.IN_PROGRESS,
    TaskStatusEnum.PENDING,
    TaskStatusEnum.CANCELLED,
    TaskStatusEnum.SKIPPED,
  ],
  [TaskStatusEnum.COMPLETED]: [TaskStatusEnum.IN_PROGRESS],
  [TaskStatusEnum.CANCELLED]: [],
  [TaskStatusEnum.SKIPPED]: [TaskStatusEnum.PENDING],
};

/** 终态：不可再变更（CANCELLED） */
export const TASK_TERMINAL_STATUSES: TaskStatusEnum[] = [TaskStatusEnum.CANCELLED];

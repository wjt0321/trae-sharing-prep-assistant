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
}

export const TASK_STATUS_LABELS: Record<TaskStatusEnum, string> = {
  [TaskStatusEnum.PENDING]: '待推进',
  [TaskStatusEnum.IN_PROGRESS]: '进行中',
  [TaskStatusEnum.COMPLETED]: '已完成',
  [TaskStatusEnum.CANCELLED]: '已取消',
  [TaskStatusEnum.BLOCKED]: '受阻',
};

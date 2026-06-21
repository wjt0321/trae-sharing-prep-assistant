import { TaskStatusEnum, TASK_STATUS_LABELS } from "@ai-task-manager/shared";

/**
 * 任务状态样式映射
 * 统一 TaskRow / StatusBadge 等组件的状态样式，消除重复定义
 */
export const STATUS_STYLE_MAP: Record<TaskStatusEnum, string> = {
  [TaskStatusEnum.PENDING]: "bg-muted text-secondary",
  [TaskStatusEnum.IN_PROGRESS]: "bg-accent/10 text-accent",
  [TaskStatusEnum.COMPLETED]: "bg-success/10 text-success",
  [TaskStatusEnum.BLOCKED]: "bg-danger/10 text-danger",
  [TaskStatusEnum.CANCELLED]: "bg-muted text-tertiary",
  [TaskStatusEnum.SKIPPED]: "bg-muted text-tertiary",
};

/**
 * 任务状态圆点样式映射（用于 TaskRow 左侧状态切换按钮）
 */
export const STATUS_DOT_STYLE_MAP: Record<
  TaskStatusEnum,
  { border: string; bg: string; icon?: string }
> = {
  [TaskStatusEnum.PENDING]: {
    border: "border-tertiary hover:border-accent",
    bg: "",
  },
  [TaskStatusEnum.IN_PROGRESS]: {
    border: "border-accent bg-accent/10",
    bg: "bg-accent",
  },
  [TaskStatusEnum.COMPLETED]: {
    border: "border-success bg-success text-white",
    bg: "",
    icon: "✓",
  },
  [TaskStatusEnum.BLOCKED]: {
    border: "border-danger bg-danger/10",
    bg: "",
    icon: "!",
  },
  [TaskStatusEnum.CANCELLED]: {
    border: "border-tertiary",
    bg: "",
  },
  [TaskStatusEnum.SKIPPED]: {
    border: "border-tertiary",
    bg: "",
  },
};

export { TaskStatusEnum, TASK_STATUS_LABELS };

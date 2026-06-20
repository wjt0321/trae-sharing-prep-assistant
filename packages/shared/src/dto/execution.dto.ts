/**
 * 执行工作台 DTO
 * 参考：05_执行工作台与推进系统实施清单.md
 *
 * 覆盖：任务 CRUD、状态推进、进度统计、下一步建议、从规划同步
 */
import type { TaskStatusEnum } from '../enums/index.js';

/** 创建执行任务请求 */
export interface CreateTaskRequestDto {
  title: string;
  description?: string;
  /** 阶段 ID（对应 Plan.content.phases[].id，可空） */
  stageId?: string;
  /** 阶段名称（冗余存储，便于列表展示） */
  stageName?: string;
  sortOrder?: number;
  dueDate?: string;
}

/** 更新执行任务请求 */
export interface UpdateTaskRequestDto {
  title?: string;
  description?: string;
  stageId?: string;
  stageName?: string;
  sortOrder?: number;
  dueDate?: string;
}

/** 推进任务状态请求 */
export interface UpdateTaskStatusRequestDto {
  status: TaskStatusEnum;
  /** 阻塞原因（status=blocked 时必填） */
  blockerNote?: string;
  /** 操作备注（记录到状态历史） */
  note?: string;
}

/** 任务列表查询参数 */
export interface TaskListQueryDto {
  /** 按阶段过滤 */
  stageId?: string;
  /** 按状态过滤 */
  status?: TaskStatusEnum;
}

/** 执行任务响应 */
export interface TaskResponseDto {
  id: string;
  goalId: string;
  stageId: string | null;
  stageName: string | null;
  title: string;
  description: string | null;
  status: TaskStatusEnum;
  sortOrder: number;
  dueDate: string | null;
  completedAt: string | null;
  /** 阻塞原因（status=blocked 时有值） */
  blockerNote: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

/** 任务状态历史记录 */
export interface TaskStatusHistoryDto {
  id: string;
  taskId: string;
  fromStatus: TaskStatusEnum | null;
  toStatus: TaskStatusEnum;
  note: string | null;
  blockerNote: string | null;
  operatorId: string;
  createdAt: string;
}

/** 从规划同步任务请求 */
export interface SyncTasksFromPlanRequestDto {
  /** 是否清空已有任务再同步（默认 false，仅追加缺失的） */
  replace?: boolean;
}

/** 从规划同步任务响应 */
export interface SyncTasksResponseDto {
  /** 同步模式 */
  mode: 'replace' | 'append';
  /** 新建任务数 */
  created: number;
  /** 跳过已存在任务数（append 模式） */
  skipped: number;
  /** 清理的旧任务数（replace 模式） */
  removed: number;
  /** 同步后的任务总数 */
  total: number;
}

/** 阶段进度统计 */
export interface PhaseProgressDto {
  stageId: string;
  stageName: string;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  pending: number;
  /** 完成率 0-100 */
  completionRate: number;
}

/** 目标整体进度 */
export interface GoalProgressDto {
  goalId: string;
  /** 任务总数 */
  totalTasks: number;
  /** 已完成 */
  completedTasks: number;
  /** 进行中 */
  inProgressTasks: number;
  /** 受阻 */
  blockedTasks: number;
  /** 待推进 */
  pendingTasks: number;
  /** 整体完成率 0-100 */
  completionRate: number;
  /** 阶段维度进度 */
  phases: PhaseProgressDto[];
  /** 是否存在阻塞 */
  hasBlocker: boolean;
  /** 是否已从规划同步任务 */
  hasSyncedTasks: boolean;
}

/** 下一步建议项 */
export interface NextStepSuggestionDto {
  /** 建议类型：action / risk / replan */
  type: 'action' | 'risk' | 'replan';
  /** 优先级：high / medium / low */
  priority: 'high' | 'medium' | 'low';
  /** 建议内容 */
  content: string;
  /** 关联任务 ID（可空） */
  taskId?: string;
}

/** 下一步建议响应 */
export interface NextStepsResponseDto {
  goalId: string;
  /** 今日行动（进行中的任务 + 高优先级待办） */
  todayActions: TaskResponseDto[];
  /** 下一步建议列表 */
  suggestions: NextStepSuggestionDto[];
  /** 是否建议重规划 */
  recommendReplan: boolean;
  /** 重规划原因（recommendReplan=true 时有值） */
  replanReason?: string;
}

/** 批量更新任务状态请求 */
export interface BatchUpdateStatusRequestDto {
  /** 任务 ID 与目标状态映射 */
  updates: Array<{
    taskId: string;
    status: TaskStatusEnum;
    blockerNote?: string;
    note?: string;
  }>;
}

/** 批量更新结果 */
export interface BatchUpdateResultDto {
  succeeded: number;
  failed: number;
  /** 失败详情 */
  failures: Array<{ taskId: string; reason: string }>;
}

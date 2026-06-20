/**
 * 共享类型定义
 */
import type {
  AiTaskStatusEnum,
  JobTypeEnum,
  RoleEnum,
  TaskStatusEnum,
  WorkspaceTypeEnum,
  GoalTypeEnum,
} from '../enums/index.js';

/** 审计字段（所有业务实体共享） */
export interface AuditableFields {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** 软删除字段 */
export interface SoftDeletableFields {
  deletedAt: string | null;
}

/** 工作区归属字段 */
export interface WorkspaceOwnedFields {
  workspaceId: string;
}

/** 任务作业类型（对应 TaskJob 表） */
export interface TaskJobRecord {
  id: string;
  type: JobTypeEnum;
  status: AiTaskStatusEnum;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 工作区成员记录 */
export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: RoleEnum;
  joinedAt: string;
}

/** 工作区记录 */
export interface WorkspaceRecord {
  id: string;
  name: string;
  type: WorkspaceTypeEnum;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/** 业务任务记录（执行工作台） */
export interface ExecutionTaskRecord {
  id: string;
  goalId: string;
  stageId: string | null;
  title: string;
  description: string | null;
  status: TaskStatusEnum;
  sortOrder: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 目标记录 */
export interface GoalRecord {
  id: string;
  workspaceId: string;
  topic: string;
  audience: string | null;
  duration: number | null;
  shareDate: string | null;
  goalType: GoalTypeEnum | null;
  preparedness: string | null;
  createdAt: string;
  updatedAt: string;
}

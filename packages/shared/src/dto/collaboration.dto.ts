/**
 * 协作评论与版本管理 DTO
 * 参考：07_协作评论与版本管理实施清单.md
 */

// ============================================================
// 枚举
// ============================================================

/** 评论锚点类型（评论关联的对象） */
export const CommentAnchorTypeEnum = {
  GOAL: 'goal',
  TASK: 'task',
  PLAN: 'plan',
  PHASE: 'phase',
} as const;
export type CommentAnchorTypeEnum = (typeof CommentAnchorTypeEnum)[keyof typeof CommentAnchorTypeEnum];

/** 评论类型：普通评论 / 批注 */
export const CommentTypeEnum = {
  COMMENT: 'comment',
  ANNOTATION: 'annotation',
} as const;
export type CommentTypeEnum = (typeof CommentTypeEnum)[keyof typeof CommentTypeEnum];

/** 活动流事件类型 */
export const ActivityEventTypeEnum = {
  GOAL_UPDATED: 'goal_updated',
  TASK_CREATED: 'task_created',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_ASSIGNED: 'task_assigned',
  TASK_UNASSIGNED: 'task_unassigned',
  PLAN_CREATED: 'plan_created',
  PLAN_REPLANNED: 'plan_replanned',
  PLAN_ACTIVATED: 'plan_activated',
  COMMENT_CREATED: 'comment_created',
  COMMENT_RESOLVED: 'comment_resolved',
} as const;
export type ActivityEventTypeEnum = (typeof ActivityEventTypeEnum)[keyof typeof ActivityEventTypeEnum];

export const ACTIVITY_EVENT_TYPE_LABELS: Record<ActivityEventTypeEnum, string> = {
  [ActivityEventTypeEnum.GOAL_UPDATED]: '更新了目标',
  [ActivityEventTypeEnum.TASK_CREATED]: '创建了任务',
  [ActivityEventTypeEnum.TASK_STATUS_CHANGED]: '变更了任务状态',
  [ActivityEventTypeEnum.TASK_ASSIGNED]: '指派了任务',
  [ActivityEventTypeEnum.TASK_UNASSIGNED]: '取消了指派',
  [ActivityEventTypeEnum.PLAN_CREATED]: '生成了规划',
  [ActivityEventTypeEnum.PLAN_REPLANNED]: '重新规划',
  [ActivityEventTypeEnum.PLAN_ACTIVATED]: '切换了活跃版本',
  [ActivityEventTypeEnum.COMMENT_CREATED]: '发表了评论',
  [ActivityEventTypeEnum.COMMENT_RESOLVED]: '解决了评论',
};

// ============================================================
// 评论 DTO
// ============================================================

export interface CreateCommentRequestDto {
  /** 评论内容 */
  content: string;
  /** 父评论 ID（回复） */
  parentId?: string;
  /** 锚点类型 */
  anchorType?: CommentAnchorTypeEnum;
  /** 锚点 ID（任务 ID / 规划 ID / 阶段 ID） */
  anchorId?: string;
  /** 评论类型：comment / annotation */
  type?: CommentTypeEnum;
  /** @提及的用户 ID 列表 */
  mentions?: string[];
}

export interface UpdateCommentRequestDto {
  content?: string;
}

export interface CommentListQueryDto {
  /** 锚点类型筛选 */
  anchorType?: CommentAnchorTypeEnum;
  /** 锚点 ID 筛选 */
  anchorId?: string;
  /** 评论类型筛选 */
  type?: CommentTypeEnum;
  /** 是否只看未解决 */
  unresolvedOnly?: boolean;
}

export interface CommentAuthorDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CommentResponseDto {
  id: string;
  goalId: string;
  author: CommentAuthorDto;
  content: string;
  parentId: string | null;
  anchorType: CommentAnchorTypeEnum | null;
  anchorId: string | null;
  type: CommentTypeEnum;
  mentions: string[];
  resolvedAt: string | null;
  /** 回复列表（仅顶层评论展开） */
  replies?: CommentResponseDto[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 任务指派 DTO
// ============================================================

export interface AssignTaskRequestDto {
  /** 被指派人 ID */
  assigneeId: string;
  /** 指派备注 */
  note?: string;
}

export interface AssignmentResponseDto {
  id: string;
  taskId: string;
  taskTitle: string;
  assignee: CommentAuthorDto;
  assignedBy: CommentAuthorDto;
  note: string | null;
  createdAt: string;
}

export interface AssignmentHistoryDto {
  id: string;
  taskId: string;
  taskTitle: string;
  assignee: CommentAuthorDto;
  assignedBy: CommentAuthorDto;
  note: string | null;
  /** 是否为当前指派 */
  isCurrent: boolean;
  createdAt: string;
}

// ============================================================
// 活动流 DTO
// ============================================================

export interface ActivityListQueryDto {
  /** 事件类型筛选 */
  type?: ActivityEventTypeEnum;
  /** 目标类型筛选（task/plan/goal/comment） */
  targetType?: string;
  /** 限制条数（默认 30，最大 100） */
  limit?: number;
}

export interface ActivityEventDto {
  id: string;
  goalId: string;
  type: ActivityEventTypeEnum;
  typeLabel: string;
  actor: CommentAuthorDto;
  /** 目标对象类型 */
  targetType: string;
  /** 目标对象 ID */
  targetId: string;
  /** 目标对象标题（便于展示） */
  targetTitle: string | null;
  /** 事件详情（如状态变更的 from/to） */
  detail: string | null;
  createdAt: string;
}

// ============================================================
// 版本历史 DTO（扩展 PlanResponseDto）
// ============================================================

export interface PlanVersionBriefDto {
  id: string;
  version: number;
  isActive: boolean;
  source: string;
  /** 版本变更原因（首版为 null，重规划为原因） */
  changeReason: string | null;
  createdAt: string;
}

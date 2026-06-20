/**
 * 通知集成与自动化 DTO
 * 参考：09_通知集成与自动化实施清单.md
 */

// ============================================================
// 枚举
// ============================================================

/** 通知类型 */
export const NotificationTypeEnum = {
  COMMENT_MENTION: 'comment_mention',
  COMMENT_REPLY: 'comment_reply',
  TASK_ASSIGNED: 'task_assigned',
  TASK_UNASSIGNED: 'task_unassigned',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_BLOCKED: 'task_blocked',
  PLAN_CREATED: 'plan_created',
  PLAN_REPLANNED: 'plan_replanned',
  PLAN_ACTIVATED: 'plan_activated',
  GOAL_STAGE_CHANGED: 'goal_stage_changed',
  INVITATION: 'invitation',
  SYSTEM: 'system',
} as const;
export type NotificationTypeEnum = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];

/** 通知目标对象类型 */
export const NotificationTargetTypeEnum = {
  GOAL: 'goal',
  TASK: 'task',
  PLAN: 'plan',
  COMMENT: 'comment',
  WORKSPACE: 'workspace',
} as const;
export type NotificationTargetTypeEnum = (typeof NotificationTargetTypeEnum)[keyof typeof NotificationTargetTypeEnum];

/** 通知类型标签（用于前端展示） */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeEnum, string> = {
  [NotificationTypeEnum.COMMENT_MENTION]: '提及了你',
  [NotificationTypeEnum.COMMENT_REPLY]: '回复了你',
  [NotificationTypeEnum.TASK_ASSIGNED]: '指派了任务',
  [NotificationTypeEnum.TASK_UNASSIGNED]: '取消了指派',
  [NotificationTypeEnum.TASK_STATUS_CHANGED]: '任务状态变更',
  [NotificationTypeEnum.TASK_BLOCKED]: '任务受阻',
  [NotificationTypeEnum.PLAN_CREATED]: '生成了新规划',
  [NotificationTypeEnum.PLAN_REPLANNED]: '重新规划',
  [NotificationTypeEnum.PLAN_ACTIVATED]: '切换了活跃版本',
  [NotificationTypeEnum.GOAL_STAGE_CHANGED]: '目标阶段变更',
  [NotificationTypeEnum.INVITATION]: '工作区邀请',
  [NotificationTypeEnum.SYSTEM]: '系统通知',
};

// ============================================================
// 通知 DTO
// ============================================================

export interface NotificationListQueryDto {
  /** 是否只看未读 */
  unreadOnly?: boolean;
  /** 通知类型筛选 */
  type?: NotificationTypeEnum;
  /** 工作区 ID 筛选 */
  workspaceId?: string;
  /** 限制条数（默认 30，最大 100） */
  limit?: number;
}

export interface NotificationResponseDto {
  id: string;
  /** 接收者用户 ID */
  userId: string;
  /** 工作区 ID */
  workspaceId: string;
  /** 通知类型 */
  type: NotificationTypeEnum;
  /** 通知类型标签 */
  typeLabel: string;
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  content: string;
  /** 目标对象类型 */
  targetType: NotificationTargetTypeEnum | null;
  /** 目标对象 ID */
  targetId: string | null;
  /** 是否已读 */
  isRead: boolean;
  /** 已读时间 */
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountResponseDto {
  /** 未读总数 */
  count: number;
  /** 按工作区分组的未读数 */
  byWorkspace: Array<{ workspaceId: string; count: number }>;
}

export interface CreateNotificationParams {
  /** 接收者用户 ID */
  userId: string;
  /** 工作区 ID */
  workspaceId: string;
  /** 通知类型 */
  type: NotificationTypeEnum;
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  content: string;
  /** 目标对象类型 */
  targetType?: NotificationTargetTypeEnum;
  /** 目标对象 ID */
  targetId?: string;
}

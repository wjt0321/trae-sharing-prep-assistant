/**
 * 审计日志 DTO
 * 参考：12_安全监控指标与发布治理实施清单.md §1
 *
 * 记录关键操作（登录/配置变更/删除/导出/分享等），
 * 不记录请求体/响应体中的敏感字段（如密码、API Key）。
 */

// ============================================================
// 枚举
// ============================================================

/** 审计动作类型 */
export const AuditActionEnum = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  SHARE: 'share',
  CONFIG_CHANGE: 'config_change',
  PASSWORD_CHANGE: 'password_change',
  INVITE: 'invite',
  ROLE_CHANGE: 'role_change',
} as const;
export type AuditActionEnum = (typeof AuditActionEnum)[keyof typeof AuditActionEnum];

/** 审计资源类型 */
export const AuditResourceTypeEnum = {
  USER: 'user',
  WORKSPACE: 'workspace',
  GOAL: 'goal',
  PLAN: 'plan',
  TASK: 'task',
  COMMENT: 'comment',
  EXPORT: 'export',
  TEMPLATE: 'template',
  ASSET: 'asset',
  NOTIFICATION: 'notification',
  AI_CONFIG: 'ai_config',
  PROMPT: 'prompt',
  SESSION: 'session',
} as const;
export type AuditResourceTypeEnum =
  (typeof AuditResourceTypeEnum)[keyof typeof AuditResourceTypeEnum];

/** 审计结果 */
export const AuditResultEnum = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;
export type AuditResultEnum = (typeof AuditResultEnum)[keyof typeof AuditResultEnum];

/** 审计动作标签（用于前端展示） */
export const AUDIT_ACTION_LABELS: Record<AuditActionEnum, string> = {
  [AuditActionEnum.LOGIN]: '登录',
  [AuditActionEnum.LOGOUT]: '退出',
  [AuditActionEnum.REGISTER]: '注册',
  [AuditActionEnum.CREATE]: '创建',
  [AuditActionEnum.UPDATE]: '更新',
  [AuditActionEnum.DELETE]: '删除',
  [AuditActionEnum.EXPORT]: '导出',
  [AuditActionEnum.SHARE]: '分享',
  [AuditActionEnum.CONFIG_CHANGE]: '配置变更',
  [AuditActionEnum.PASSWORD_CHANGE]: '密码修改',
  [AuditActionEnum.INVITE]: '邀请',
  [AuditActionEnum.ROLE_CHANGE]: '角色变更',
};

// ============================================================
// DTO
// ============================================================

/** 审计日志查询参数 */
export interface AuditLogQueryDto {
  /** 操作者 ID 筛选 */
  actorId?: string;
  /** 动作类型筛选 */
  action?: AuditActionEnum;
  /** 资源类型筛选 */
  resourceType?: AuditResourceTypeEnum;
  /** 资源 ID 筛选 */
  resourceId?: string;
  /** 结果筛选 */
  result?: AuditResultEnum;
  /** 起始时间（ISO 8601） */
  startDate?: string;
  /** 结束时间（ISO 8601） */
  endDate?: string;
  /** 关键词搜索（操作者邮箱 / 路径） */
  keyword?: string;
  /** 页码 */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/** 审计日志响应 */
export interface AuditLogResponseDto {
  id: string;
  /** 操作者 ID */
  actorId: string | null;
  /** 操作者邮箱 */
  actorEmail: string | null;
  /** 动作类型 */
  action: AuditActionEnum;
  /** 动作标签 */
  actionLabel: string;
  /** 资源类型 */
  resourceType: AuditResourceTypeEnum | null;
  /** 资源 ID */
  resourceId: string | null;
  /** 结果 */
  result: AuditResultEnum;
  /** 失败原因 */
  errorMessage: string | null;
  /** 客户端 IP */
  ipAddress: string | null;
  /** User-Agent */
  userAgent: string | null;
  /** 请求方法 */
  method: string | null;
  /** 请求路径 */
  path: string | null;
  /** 上下文详情（解析后的对象） */
  detail: Record<string, unknown> | null;
  createdAt: string;
}

/** 审计日志创建参数（供后端服务调用） */
export interface CreateAuditLogParams {
  actorId?: string | null;
  actorEmail?: string | null;
  action: AuditActionEnum;
  resourceType?: AuditResourceTypeEnum | null;
  resourceId?: string | null;
  result?: AuditResultEnum;
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  method?: string | null;
  path?: string | null;
  /** 上下文详情（非敏感字段） */
  detail?: Record<string, unknown> | null;
}

/** 审计统计响应 */
export interface AuditStatsDto {
  /** 统计时间范围（天） */
  days: number;
  /** 总操作数 */
  totalActions: number;
  /** 成功操作数 */
  totalSuccess: number;
  /** 失败操作数 */
  totalFailure: number;
  /** 按动作统计 */
  byAction: Array<{ action: string; count: number; successCount: number; failureCount: number }>;
  /** 按资源类型统计 */
  byResourceType: Array<{ resourceType: string; count: number }>;
  /** 按日统计（最近 N 天） */
  byDay: Array<{ date: string; count: number; failureCount: number }>;
  /** 最近失败操作（前 10 条） */
  recentFailures: Array<{
    id: string;
    action: string;
    actorEmail: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

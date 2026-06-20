/**
 * 统一错误码
 * 参考：01_产品骨架与仓库迁移实施清单.md（统一错误码）
 *
 * 命名规则：{模块}_{具体错误}，全部大写下划线
 * 数值规则：按模块分段，便于定位
 *   - 1xxx  通用
 *   - 2xxx  认证
 *   - 3xxx  工作区
 *   - 4xxx  目标
 *   - 5xxx  规划
 *   - 6xxx  执行
 *   - 7xxx  知识库
 *   - 8xxx  协作
 *   - 9xxx  导出
 *   - 10xxx 集成
 *   - 11xxx AI 网关
 *   - 12xxx 任务调度
 *   - 13xxx 审计与监控
 */
export const ErrorCode = {
  // 通用
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: '服务器内部错误' },
  BAD_REQUEST: { code: 'BAD_REQUEST', status: 400, message: '请求参数错误' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401, message: '未授权' },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: '无权访问' },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: '资源不存在' },
  CONFLICT: { code: 'CONFLICT', status: 409, message: '资源冲突' },
  VALIDATION_FAILED: { code: 'VALIDATION_FAILED', status: 422, message: '数据校验失败' },
  RATE_LIMITED: { code: 'RATE_LIMITED', status: 429, message: '请求过于频繁' },

  // 认证
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', status: 401, message: '邮箱或密码错误' },
  AUTH_TOKEN_EXPIRED: { code: 'AUTH_TOKEN_EXPIRED', status: 401, message: '登录已过期' },
  AUTH_TOKEN_INVALID: { code: 'AUTH_TOKEN_INVALID', status: 401, message: '登录态无效' },
  AUTH_EMAIL_ALREADY_USED: { code: 'AUTH_EMAIL_ALREADY_USED', status: 409, message: '邮箱已被注册' },

  // 工作区
  WORKSPACE_NOT_FOUND: { code: 'WORKSPACE_NOT_FOUND', status: 404, message: '工作区不存在' },
  WORKSPACE_MEMBER_NOT_FOUND: { code: 'WORKSPACE_MEMBER_NOT_FOUND', status: 404, message: '成员不存在' },
  WORKSPACE_INVITE_EXPIRED: { code: 'WORKSPACE_INVITE_EXPIRED', status: 410, message: '邀请已过期' },
  WORKSPACE_MEMBER_LIMIT_EXCEEDED: { code: 'WORKSPACE_MEMBER_LIMIT_EXCEEDED', status: 403, message: '工作区成员数量超限' },

  // 目标
  GOAL_NOT_FOUND: { code: 'GOAL_NOT_FOUND', status: 404, message: '目标不存在' },
  GOAL_TOPIC_REQUIRED: { code: 'GOAL_TOPIC_REQUIRED', status: 422, message: '目标主题不能为空' },

  // 规划
  PLAN_NOT_FOUND: { code: 'PLAN_NOT_FOUND', status: 404, message: '规划方案不存在' },
  PLAN_GENERATION_FAILED: { code: 'PLAN_GENERATION_FAILED', status: 500, message: '规划生成失败' },
  PLAN_VERSION_CONFLICT: { code: 'PLAN_VERSION_CONFLICT', status: 409, message: '规划版本冲突' },

  // 执行
  EXECUTION_TASK_NOT_FOUND: { code: 'EXECUTION_TASK_NOT_FOUND', status: 404, message: '执行任务不存在' },
  EXECUTION_TASK_ALREADY_COMPLETED: { code: 'EXECUTION_TASK_ALREADY_COMPLETED', status: 409, message: '任务已完成，无法修改' },

  // 知识库
  KNOWLEDGE_ASSET_NOT_FOUND: { code: 'KNOWLEDGE_ASSET_NOT_FOUND', status: 404, message: '知识资产不存在' },
  KNOWLEDGE_TEMPLATE_NOT_FOUND: { code: 'KNOWLEDGE_TEMPLATE_NOT_FOUND', status: 404, message: '模板不存在' },

  // 协作
  COLLABORATION_COMMENT_NOT_FOUND: { code: 'COLLABORATION_COMMENT_NOT_FOUND', status: 404, message: '评论不存在' },

  // 通知
  NOTIFICATION_NOT_FOUND: { code: 'NOTIFICATION_NOT_FOUND', status: 404, message: '通知不存在' },

  // 导出
  EXPORT_FAILED: { code: 'EXPORT_FAILED', status: 500, message: '导出失败' },
  EXPORT_FORMAT_UNSUPPORTED: { code: 'EXPORT_FORMAT_UNSUPPORTED', status: 422, message: '不支持的导出格式' },

  // 集成
  INTEGRATION_NOT_CONFIGURED: { code: 'INTEGRATION_NOT_CONFIGURED', status: 409, message: '集成未配置' },
  INTEGRATION_CALL_FAILED: { code: 'INTEGRATION_CALL_FAILED', status: 502, message: '外部调用失败' },

  // AI 网关
  AI_GATEWAY_UNAVAILABLE: { code: 'AI_GATEWAY_UNAVAILABLE', status: 503, message: 'AI 网关不可用' },
  AI_GATEWAY_TIMEOUT: { code: 'AI_GATEWAY_TIMEOUT', status: 504, message: 'AI 调用超时' },
  AI_GATEWAY_RATE_LIMITED: { code: 'AI_GATEWAY_RATE_LIMITED', status: 429, message: 'AI 调用频次超限' },

  // 任务调度
  TASK_JOB_NOT_FOUND: { code: 'TASK_JOB_NOT_FOUND', status: 404, message: '任务不存在' },
  TASK_JOB_ALREADY_TERMINAL: { code: 'TASK_JOB_ALREADY_TERMINAL', status: 409, message: '任务已处于终态' },
  TASK_JOB_RETRY_EXHAUSTED: { code: 'TASK_JOB_RETRY_EXHAUSTED', status: 500, message: '任务重试次数耗尽' },

  // 审计与监控
  AUDIT_LOG_NOT_FOUND: { code: 'AUDIT_LOG_NOT_FOUND', status: 404, message: '审计日志不存在' },
  MONITORING_QUERY_FAILED: { code: 'MONITORING_QUERY_FAILED', status: 500, message: '监控指标查询失败' },
  RATE_LIMIT_EXCEEDED: { code: 'RATE_LIMIT_EXCEEDED', status: 429, message: '请求频率超限，请稍后再试' },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;

export interface ErrorCodeDefinition {
  code: string;
  status: number;
  message: string;
}

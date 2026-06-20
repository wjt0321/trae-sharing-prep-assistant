/**
 * 监控与指标 DTO
 * 参考：12_安全监控指标与发布治理实施清单.md §4 §5
 *
 * 包含：
 * - 健康检查扩展（DB / 磁盘 / 任务积压）
 * - 业务指标聚合（目标创建 / 规划采纳 / 重规划 / 推进率 / 导出分享 / 模板复用）
 * - 系统指标（请求量 / 错误率 / 慢请求）
 */

// ============================================================
// 健康检查
// ============================================================

/** 健康检查状态 */
export const HealthStatusEnum = {
  OK: 'ok',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
} as const;
export type HealthStatusEnum = (typeof HealthStatusEnum)[keyof typeof HealthStatusEnum];

/** 单项检查结果 */
export interface HealthCheckResultDto {
  /** 检查项名称 */
  name: string;
  /** 状态 */
  status: HealthStatusEnum;
  /** 耗时（毫秒） */
  durationMs: number;
  /** 详情 */
  detail?: string;
  /** 错误信息（status != ok 时有值） */
  errorMessage?: string;
}

/** 健康检查响应 */
export interface HealthResponseDto {
  /** 整体状态 */
  status: HealthStatusEnum;
  /** 服务名 */
  service: string;
  /** 版本号 */
  version: string;
  /** 环境标识 */
  env: string;
  /** 服务端时间戳（ISO 8601） */
  timestamp: string;
  /** 启动时间（ISO 8601） */
  startedAt: string;
  /** 运行时长（秒） */
  uptimeSeconds: number;
  /** 各项检查结果 */
  checks: HealthCheckResultDto[];
}

// ============================================================
// 业务指标
// ============================================================

/** 业务指标响应 */
export interface BusinessMetricsDto {
  /** 统计时间范围（天） */
  days: number;
  /** 生成时间（ISO 8601） */
  generatedAt: string;
  /** 目标创建成功率 */
  goalCreation: {
    /** 总尝试次数 */
    totalAttempts: number;
    /** 成功次数 */
    successCount: number;
    /** 成功率（0-1） */
    successRate: number;
    /** 按场景类型分布 */
    byScenarioType: Array<{ scenarioType: string; count: number }>;
    /** 按日分布 */
    byDay: Array<{ date: string; count: number }>;
  };
  /** 首版规划采纳率 */
  planAdoption: {
    /** 有规划的目标数 */
    goalsWithPlan: number;
    /** 总目标数 */
    totalGoals: number;
    /** 采纳率（0-1） */
    adoptionRate: number;
    /** 规划来源分布 */
    bySource: Array<{ source: string; count: number }>;
  };
  /** 重规划使用率 */
  replanUsage: {
    /** 有重规划的目标数 */
    goalsWithReplan: number;
    /** 总重规划次数 */
    totalReplans: number;
    /** 平均每个重规划目标的次数 */
    avgReplansPerGoal: number;
    /** 重规划使用率（0-1，有重规划的目标 / 有规划的目标） */
    replanRate: number;
  };
  /** 目标推进率 */
  goalProgress: {
    /** 各阶段目标数 */
    byStage: Array<{ stage: string; count: number }>;
    /** 已完成目标数 */
    completedCount: number;
    /** 总目标数 */
    totalGoals: number;
    /** 完成率（0-1） */
    completionRate: number;
    /** 平均任务完成率 */
    avgTaskCompletionRate: number;
  };
  /** 导出与分享使用率 */
  exportShare: {
    /** 总导出次数 */
    totalExports: number;
    /** 按导出类型分布 */
    byType: Array<{ type: string; count: number }>;
    /** 分享链接数 */
    shareCount: number;
    /** 导出失败次数 */
    failureCount: number;
  };
  /** 模板复用率 */
  templateReuse: {
    /** 模板总数 */
    totalTemplates: number;
    /** 模板使用总次数 */
    totalUsageCount: number;
    /** 平均每个模板使用次数 */
    avgUsagePerTemplate: number;
    /** 从模板创建的目标数（使用次数 > 0 的模板） */
    templatesUsed: number;
    /** 模板复用率（0-1，被使用过的模板 / 总模板） */
    reuseRate: number;
    /** 热门模板（使用次数前 5） */
    topTemplates: Array<{
      templateId: string;
      name: string;
      category: string;
      usageCount: number;
    }>;
  };
}

// ============================================================
// 系统指标
// ============================================================

/** 系统指标响应 */
export interface SystemMetricsDto {
  /** 统计时间范围（天） */
  days: number;
  /** 生成时间（ISO 8601） */
  generatedAt: string;
  /** 请求统计 */
  requests: {
    /** 总请求数 */
    totalRequests: number;
    /** 成功请求数（2xx） */
    successRequests: number;
    /** 客户端错误数（4xx） */
    clientErrors: number;
    /** 服务端错误数（5xx） */
    serverErrors: number;
    /** 错误率（0-1） */
    errorRate: number;
    /** 平均响应时间（毫秒） */
    avgDurationMs: number;
    /** 慢请求数（>1s） */
    slowRequests: number;
    /** 按状态码分布 */
    byStatusCode: Array<{ statusCode: string; count: number }>;
    /** 按日分布 */
    byDay: Array<{
      date: string;
      totalRequests: number;
      errorCount: number;
      avgDurationMs: number;
    }>;
  };
  /** 任务队列统计 */
  taskQueue: {
    /** 排队中任务数 */
    queued: number;
    /** 执行中任务数 */
    running: number;
    /** 已成功任务数（最近 N 天） */
    succeeded: number;
    /** 已失败任务数（最近 N 天） */
    failed: number;
    /** 失败率（0-1） */
    failureRate: number;
    /** 按任务类型分布（最近 N 天） */
    byType: Array<{ type: string; count: number; failureCount: number }>;
  };
  /** AI 调用统计 */
  aiCalls: {
    /** 总调用次数（最近 N 天） */
    totalCalls: number;
    /** 成功次数 */
    successCount: number;
    /** 失败次数 */
    failureCount: number;
    /** 失败率（0-1） */
    failureRate: number;
    /** 平均耗时（毫秒） */
    avgDurationMs: number;
  };
  /** 数据库统计 */
  database: {
    /** 数据库文件大小（字节） */
    dbSizeBytes: number;
    /** 各表行数 */
    tableCounts: Array<{ table: string; count: number }>;
  };
}

// ============================================================
// 速率限制
// ============================================================

/** 速率限制配置 */
export interface RateLimitConfigDto {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
};

/** 速率限制结果 */
export interface RateLimitResultDto {
  /** 是否允许 */
  allowed: boolean;
  /** 当前窗口内已用请求数 */
  current: number;
  /** 窗口内最大请求数 */
  limit: number;
  /** 重置时间（ISO 8601） */
  resetAt: string;
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  HealthStatusEnum,
  type HealthCheckResultDto,
  type HealthResponseDto,
  type BusinessMetricsDto,
  type SystemMetricsDto,
} from '@ai-task-manager/shared';

/**
 * 监控服务
 * 参考：12_安全监控指标与发布治理实施清单.md §4 §5
 *
 * 提供：
 * - 健康检查（DB / 磁盘 / 任务积压）
 * - 业务指标聚合（目标 / 规划 / 执行 / 导出 / 模板）
 * - 系统指标（请求量 / 错误率 / 任务队列 / AI 调用 / DB）
 * - 运行时请求统计（由 RequestLogMiddleware 写入）
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly startedAt = new Date();
  private readonly version: string;
  private readonly env: string;
  private readonly dbPath: string;

  /** 运行时请求统计（按日 + 状态码） */
  private requestStats = new Map<
    string, // YYYY-MM-DD
    {
      total: number;
      success: number; // 2xx
      clientErrors: number; // 4xx
      serverErrors: number; // 5xx
      totalDurationMs: number;
      slowRequests: number; // >1s
      byStatusCode: Map<string, number>;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.version = this.configService.get<string>('npm_package_version', '0.1.0');
    this.env = this.configService.get<string>('NODE_ENV', 'development');
    const dbUrl = this.configService.get<string>('DATABASE_URL', 'file:./dev.db');
    // 解析 SQLite 文件路径（file:./dev.db → ./dev.db）
    this.dbPath = dbUrl.replace(/^file:/, '');
  }

  /**
   * 记录一次请求（由 RequestLogMiddleware 调用）
   */
  recordRequest(statusCode: number, durationMs: number): void {
    const day = new Date().toISOString().slice(0, 10);
    const stat = this.requestStats.get(day) ?? {
      total: 0,
      success: 0,
      clientErrors: 0,
      serverErrors: 0,
      totalDurationMs: 0,
      slowRequests: 0,
      byStatusCode: new Map<string, number>(),
    };
    stat.total += 1;
    stat.totalDurationMs += durationMs;
    if (durationMs > 1000) stat.slowRequests += 1;
    if (statusCode >= 200 && statusCode < 300) stat.success += 1;
    else if (statusCode >= 400 && statusCode < 500) stat.clientErrors += 1;
    else if (statusCode >= 500) stat.serverErrors += 1;
    const codeKey = `${Math.floor(statusCode / 100)}xx`;
    stat.byStatusCode.set(codeKey, (stat.byStatusCode.get(codeKey) ?? 0) + 1);
    this.requestStats.set(day, stat);
  }

  /**
   * 健康检查（扩展版）
   */
  async checkHealth(): Promise<HealthResponseDto> {
    const checks: HealthCheckResultDto[] = [];

    // 1. 数据库连接检查
    checks.push(await this.checkDatabase());

    // 2. 磁盘空间检查
    checks.push(await this.checkDisk());

    // 3. 任务积压检查
    checks.push(await this.checkTaskBacklog());

    // 整体状态：任一 unhealthy → unhealthy；任一 degraded → degraded
    let overall: HealthStatusEnum = HealthStatusEnum.OK;
    if (checks.some((c) => c.status === HealthStatusEnum.UNHEALTHY)) {
      overall = HealthStatusEnum.UNHEALTHY;
    } else if (checks.some((c) => c.status === HealthStatusEnum.DEGRADED)) {
      overall = HealthStatusEnum.DEGRADED;
    }

    return {
      status: overall,
      service: 'ai-task-manager-server',
      version: this.version,
      env: this.env,
      timestamp: new Date().toISOString(),
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      checks,
    };
  }

  /**
   * 业务指标聚合
   */
  async getBusinessMetrics(days = 7): Promise<BusinessMetricsDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalGoals,
      goalsWithPlan,
      goalsByStage,
      goalCreationRecent,
      goalsByScenario,
      plansBySource,
      planVersions,
      completedGoals,
      taskStats,
      exportsRecent,
      exportsByType,
      shareCount,
      exportFailures,
      totalTemplates,
      templateUsageSum,
      templatesUsed,
      topTemplates,
    ] = await Promise.all([
      this.prisma.goal.count({ where: { deletedAt: null } }),
      this.prisma.plan.findMany({
        where: { goal: { deletedAt: null } },
        select: { goalId: true, isActive: true, source: true },
        distinct: ['goalId'],
      }),
      this.prisma.goal.groupBy({
        by: ['currentStage'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.goal.findMany({
        where: { createdAt: { gte: startDate }, deletedAt: null },
        select: { createdAt: true, scenarioType: true },
      }),
      this.prisma.goal.groupBy({
        by: ['scenarioType'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.plan.groupBy({
        by: ['source'],
        _count: { _all: true },
      }),
      this.prisma.plan.groupBy({
        by: ['goalId'],
        _count: { _all: true },
      }),
      this.prisma.goal.count({
        where: { deletedAt: null, currentStage: 'done' },
      }),
      this.prisma.executionTask.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.exportRecord.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.exportRecord.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      this.prisma.exportRecord.count({
        where: { shareToken: { not: null } },
      }),
      this.prisma.exportRecord.count({
        where: { status: 'failed' },
      }),
      this.prisma.template.count(),
      this.prisma.template.aggregate({ _sum: { usageCount: true } }),
      this.prisma.template.count({ where: { usageCount: { gt: 0 } } }),
      this.prisma.template.findMany({
        orderBy: { usageCount: 'desc' },
        take: 5,
        select: { id: true, name: true, category: true, usageCount: true },
      }),
    ]);

    // 目标创建成功率（当前阶段：所有创建都视为成功，失败率由审计日志统计）
    const goalCreationAttempts = goalCreationRecent.length;
    const goalCreationByDay = this.aggregateByDay(
      goalCreationRecent.map((g) => g.createdAt),
    );
    const goalCreationByScenario = goalsByScenario
      .filter((g) => g.scenarioType !== null)
      .map((g) => ({ scenarioType: g.scenarioType as string, count: g._count._all }));

    // 规划采纳率
    const goalsWithPlanCount = goalsWithPlan.length;
    const planAdoptionRate = totalGoals > 0 ? goalsWithPlanCount / totalGoals : 0;

    // 重规划使用率
    const goalsWithReplan = planVersions.filter((p) => p._count._all > 1).length;
    const totalReplans = planVersions.reduce(
      (sum, p) => sum + (p._count._all - 1),
      0,
    );
    const avgReplansPerGoal =
      goalsWithReplan > 0 ? totalReplans / goalsWithReplan : 0;
    const replanRate =
      goalsWithPlanCount > 0 ? goalsWithReplan / goalsWithPlanCount : 0;

    // 目标推进率
    const goalProgressByStage = goalsByStage.map((g) => ({
      stage: g.currentStage,
      count: g._count._all,
    }));
    const completionRate = totalGoals > 0 ? completedGoals / totalGoals : 0;
    const totalTasks = taskStats.reduce((s, t) => s + t._count._all, 0);
    const completedTasks =
      taskStats.find((t) => t.status === 'completed')?._count._all ?? 0;
    const avgTaskCompletionRate =
      totalTasks > 0 ? completedTasks / totalTasks : 0;

    // 模板复用率
    const totalUsageCount = templateUsageSum._sum.usageCount ?? 0;
    const avgUsagePerTemplate =
      totalTemplates > 0 ? totalUsageCount / totalTemplates : 0;
    const reuseRate = totalTemplates > 0 ? templatesUsed / totalTemplates : 0;

    return {
      days,
      generatedAt: new Date().toISOString(),
      goalCreation: {
        totalAttempts: goalCreationAttempts,
        successCount: goalCreationAttempts, // 当前阶段：创建即成功
        successRate: goalCreationAttempts > 0 ? 1 : 0,
        byScenarioType: goalCreationByScenario,
        byDay: goalCreationByDay,
      },
      planAdoption: {
        goalsWithPlan: goalsWithPlanCount,
        totalGoals,
        adoptionRate: planAdoptionRate,
        bySource: plansBySource.map((p) => ({
          source: p.source,
          count: p._count._all,
        })),
      },
      replanUsage: {
        goalsWithReplan,
        totalReplans,
        avgReplansPerGoal,
        replanRate,
      },
      goalProgress: {
        byStage: goalProgressByStage,
        completedCount: completedGoals,
        totalGoals,
        completionRate,
        avgTaskCompletionRate,
      },
      exportShare: {
        totalExports: exportsRecent,
        byType: exportsByType.map((e) => ({
          type: e.type,
          count: e._count._all,
        })),
        shareCount,
        failureCount: exportFailures,
      },
      templateReuse: {
        totalTemplates,
        totalUsageCount,
        avgUsagePerTemplate,
        templatesUsed,
        reuseRate,
        topTemplates: topTemplates.map((t) => ({
          templateId: t.id,
          name: t.name,
          category: t.category,
          usageCount: t.usageCount,
        })),
      },
    };
  }

  /**
   * 系统指标
   */
  async getSystemMetrics(days = 7): Promise<SystemMetricsDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [queuedJobs, runningJobs, recentJobs, aiCallLogs, dbSize, tableCounts] =
      await Promise.all([
        this.prisma.taskJob.count({ where: { status: 'queued' } }),
        this.prisma.taskJob.count({ where: { status: 'running' } }),
        this.prisma.taskJob.findMany({
          where: { createdAt: { gte: startDate } },
          select: { type: true, status: true },
        }),
        this.prisma.aiCallLog.findMany({
          where: { createdAt: { gte: startDate } },
          select: { success: true, durationMs: true },
        }),
        this.getDbSize(),
        this.getTableCounts(),
      ]);

    // 请求统计（从内存读取）
    const requestStats = this.aggregateRequestStats(days);

    // 任务队列统计
    const succeededJobs = recentJobs.filter((j) => j.status === 'succeeded').length;
    const failedJobs = recentJobs.filter((j) => j.status === 'failed').length;
    const taskByTypeMap = new Map<
      string,
      { count: number; failureCount: number }
    >();
    for (const j of recentJobs) {
      const cur = taskByTypeMap.get(j.type) ?? { count: 0, failureCount: 0 };
      cur.count += 1;
      if (j.status === 'failed') cur.failureCount += 1;
      taskByTypeMap.set(j.type, cur);
    }

    // AI 调用统计
    const aiTotalCalls = aiCallLogs.length;
    const aiSuccessCount = aiCallLogs.filter((l) => l.success).length;
    const aiFailureCount = aiTotalCalls - aiSuccessCount;
    const aiAvgDuration =
      aiTotalCalls > 0
        ? aiCallLogs.reduce((s, l) => s + l.durationMs, 0) / aiTotalCalls
        : 0;

    return {
      days,
      generatedAt: new Date().toISOString(),
      requests: requestStats,
      taskQueue: {
        queued: queuedJobs,
        running: runningJobs,
        succeeded: succeededJobs,
        failed: failedJobs,
        failureRate: recentJobs.length > 0 ? failedJobs / recentJobs.length : 0,
        byType: Array.from(taskByTypeMap.entries()).map(([type, v]) => ({
          type,
          count: v.count,
          failureCount: v.failureCount,
        })),
      },
      aiCalls: {
        totalCalls: aiTotalCalls,
        successCount: aiSuccessCount,
        failureCount: aiFailureCount,
        failureRate: aiTotalCalls > 0 ? aiFailureCount / aiTotalCalls : 0,
        avgDurationMs: aiAvgDuration,
      },
      database: {
        dbSizeBytes: dbSize,
        tableCounts,
      },
    };
  }

  // ============================================================
  // 私有方法
  // ============================================================

  private async checkDatabase(): Promise<HealthCheckResultDto> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const durationMs = Date.now() - start;
      return {
        name: 'database',
        status: HealthStatusEnum.OK,
        durationMs,
        detail: 'SQLite 连接正常',
      };
    } catch (err) {
      return {
        name: 'database',
        status: HealthStatusEnum.UNHEALTHY,
        durationMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkDisk(): Promise<HealthCheckResultDto> {
    const start = Date.now();
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dbPath = path.resolve(process.cwd(), this.dbPath);
      const stat = await fs.stat(dbPath);
      const sizeBytes = stat.size;
      // SQLite 本地文件，阈值：1GB 警告，10GB 不健康
      const sizeMb = sizeBytes / (1024 * 1024);
      let status: HealthStatusEnum = HealthStatusEnum.OK;
      let detail = `DB 文件大小: ${sizeMb.toFixed(2)} MB`;
      if (sizeMb > 10240) {
        status = HealthStatusEnum.UNHEALTHY;
        detail = `DB 文件过大: ${sizeMb.toFixed(2)} MB (>10GB)`;
      } else if (sizeMb > 1024) {
        status = HealthStatusEnum.DEGRADED;
        detail = `DB 文件较大: ${sizeMb.toFixed(2)} MB (>1GB)`;
      }
      return {
        name: 'disk',
        status,
        durationMs: Date.now() - start,
        detail,
      };
    } catch (err) {
      return {
        name: 'disk',
        status: HealthStatusEnum.DEGRADED,
        durationMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
        detail: '无法读取 DB 文件大小',
      };
    }
  }

  private async checkTaskBacklog(): Promise<HealthCheckResultDto> {
    const start = Date.now();
    try {
      const queued = await this.prisma.taskJob.count({
        where: { status: 'queued' },
      });
      const running = await this.prisma.taskJob.count({
        where: { status: 'running' },
      });
      // 阈值：积压 >100 警告，>500 不健康
      let status: HealthStatusEnum = HealthStatusEnum.OK;
      if (queued > 500) status = HealthStatusEnum.UNHEALTHY;
      else if (queued > 100) status = HealthStatusEnum.DEGRADED;
      return {
        name: 'task-backlog',
        status,
        durationMs: Date.now() - start,
        detail: `排队中: ${queued}, 执行中: ${running}`,
      };
    } catch (err) {
      return {
        name: 'task-backlog',
        status: HealthStatusEnum.UNHEALTHY,
        durationMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async getDbSize(): Promise<number> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dbPath = path.resolve(process.cwd(), this.dbPath);
      const stat = await fs.stat(dbPath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  private async getTableCounts(): Promise<Array<{ table: string; count: number }>> {
    const tables = [
      'User',
      'Workspace',
      'WorkspaceMember',
      'Goal',
      'Plan',
      'ExecutionTask',
      'Comment',
      'ActivityEvent',
      'Template',
      'KnowledgeAsset',
      'ExportRecord',
      'Notification',
      'TaskJob',
      'AiCallLog',
      'AiProviderConfig',
      'PromptTemplate',
      'AuditLog',
    ];
    const result: Array<{ table: string; count: number }> = [];
    for (const table of tables) {
      try {
        // @ts-expect-error 动态模型访问
        const count = await this.prisma[table].count();
        result.push({ table, count });
      } catch {
        // 忽略不存在的表
      }
    }
    return result;
  }

  private aggregateRequestStats(days: number): SystemMetricsDto['requests'] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDay = cutoff.toISOString().slice(0, 10);

    let totalRequests = 0;
    let successRequests = 0;
    let clientErrors = 0;
    let serverErrors = 0;
    let totalDurationMs = 0;
    let slowRequests = 0;
    const byStatusCodeMap = new Map<string, number>();
    const byDayMap = new Map<
      string,
      { totalRequests: number; errorCount: number; totalDurationMs: number }
    >();

    for (const [day, stat] of this.requestStats.entries()) {
      if (day < cutoffDay) continue;
      totalRequests += stat.total;
      successRequests += stat.success;
      clientErrors += stat.clientErrors;
      serverErrors += stat.serverErrors;
      totalDurationMs += stat.totalDurationMs;
      slowRequests += stat.slowRequests;
      for (const [code, count] of stat.byStatusCode.entries()) {
        byStatusCodeMap.set(code, (byStatusCodeMap.get(code) ?? 0) + count);
      }
      byDayMap.set(day, {
        totalRequests: stat.total,
        errorCount: stat.clientErrors + stat.serverErrors,
        totalDurationMs: stat.totalDurationMs,
      });
    }

    return {
      totalRequests,
      successRequests,
      clientErrors,
      serverErrors,
      errorRate: totalRequests > 0 ? (clientErrors + serverErrors) / totalRequests : 0,
      avgDurationMs: totalRequests > 0 ? totalDurationMs / totalRequests : 0,
      slowRequests,
      byStatusCode: Array.from(byStatusCodeMap.entries()).map(([statusCode, count]) => ({
        statusCode,
        count,
      })),
      byDay: Array.from(byDayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
          date,
          totalRequests: v.totalRequests,
          errorCount: v.errorCount,
          avgDurationMs: v.totalRequests > 0 ? v.totalDurationMs / v.totalRequests : 0,
        })),
    };
  }

  private aggregateByDay(dates: Date[]): Array<{ date: string; count: number }> {
    const map = new Map<string, number>();
    for (const d of dates) {
      const day = d.toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }

  /** 暴露启动时间（供 HealthController 使用） */
  getStartedAt(): Date {
    return this.startedAt;
  }
}

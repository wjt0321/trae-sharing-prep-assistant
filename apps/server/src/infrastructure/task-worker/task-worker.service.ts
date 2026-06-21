import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiTaskStatusEnum, JobTypeEnum } from '@ai-task-manager/shared';

/**
 * 本地任务调度 Worker
 * 参考：11_后端平台数据层与AI基础设施实施清单.md
 *
 * 实现：数据库任务表 + 应用内轮询
 * 不依赖 Redis / BullMQ，满足 Windows 本地可运行要求
 */
@Injectable()
export class TaskWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private sessionCleanupTimer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly sessionCleanupIntervalMs: number;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.intervalMs = configService.get<number>('TASK_WORKER_INTERVAL_MS', 5000);
    this.batchSize = Number(configService.get('TASK_WORKER_BATCH_SIZE', '5')) || 5;
    // Session 清理间隔：默认 10 分钟
    this.sessionCleanupIntervalMs = configService.get<number>(
      'SESSION_CLEANUP_INTERVAL_MS',
      10 * 60 * 1000,
    );
  }

  onModuleInit(): void {
    this.logger.log(`任务 Worker 已启动，轮询间隔 ${this.intervalMs}ms`);
    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        this.logger.error(`任务轮询失败: ${err.message}`, err.stack);
      });
    }, this.intervalMs);

    // Session 清理：定期删除过期会话，防止 Session 表无限增长
    this.sessionCleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions().catch((err) => {
        this.logger.error(`Session 清理失败: ${err.message}`, err.stack);
      });
    }, this.sessionCleanupIntervalMs);
    // 启动时立即执行一次
    this.cleanupExpiredSessions().catch((err) => {
      this.logger.error(`启动期 Session 清理失败: ${err.message}`, err.stack);
    });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
      this.sessionCleanupTimer = null;
    }
    this.logger.log('任务 Worker 已停止');
  }

  /**
   * 单次轮询：拉取 queued 任务并处理
   */
  private async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const jobs = await this.prisma.taskJob.findMany({
        where: {
          status: AiTaskStatusEnum.QUEUED,
          scheduledAt: { lte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        take: this.batchSize,
      });

      if (jobs.length === 0) return;
      this.logger.log(`拉取到 ${jobs.length} 个待执行任务`);

      for (const job of jobs) {
        await this.processJob(job.id, job.type as JobTypeEnum, job.payload);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理单个任务（含状态流转与重试）
   */
  private async processJob(
    jobId: string,
    type: JobTypeEnum,
    payload: string,
  ): Promise<void> {
    // 标记为 running
    await this.prisma.taskJob.update({
      where: { id: jobId },
      data: {
        status: AiTaskStatusEnum.RUNNING,
        startedAt: new Date(),
      },
    });

    try {
      const result = await this.executeJob(type, payload);
      await this.prisma.taskJob.update({
        where: { id: jobId },
        data: {
          status: AiTaskStatusEnum.SUCCEEDED,
          result: JSON.stringify(result),
          finishedAt: new Date(),
        },
      });
      this.logger.log(`任务 ${jobId} (${type}) 执行成功`);
    } catch (error) {
      const job = await this.prisma.taskJob.findUnique({ where: { id: jobId } });
      const retryCount = (job?.retryCount ?? 0) + 1;
      const maxRetries = job?.maxRetries ?? 3;
      const isExhausted = retryCount >= maxRetries;

      await this.prisma.taskJob.update({
        where: { id: jobId },
        data: {
          status: isExhausted ? AiTaskStatusEnum.FAILED : AiTaskStatusEnum.QUEUED,
          retryCount,
          errorMessage: error instanceof Error ? error.message : String(error),
          finishedAt: isExhausted ? new Date() : null,
          // 未耗尽重试次数则延迟 30 秒后重试
          scheduledAt: isExhausted ? undefined : new Date(Date.now() + 30_000),
        },
      });

      if (isExhausted) {
        this.logger.error(`任务 ${jobId} (${type}) 重试耗尽，已标记为失败`);
      } else {
        this.logger.warn(`任务 ${jobId} (${type}) 失败，将重试 (${retryCount}/${maxRetries})`);
      }
    }
  }

  /**
   * 实际执行任务逻辑（按类型分发）
   * 当前阶段：仅占位，后续接入规划引擎、导出、通知等
   */
  private async executeJob(
    type: JobTypeEnum,
    payload: string,
  ): Promise<Record<string, unknown>> {
    const params = JSON.parse(payload);
    switch (type) {
      case JobTypeEnum.PLAN_GENERATION:
        // TODO: 接入规划引擎
        this.logger.log(`[占位] 规划生成任务，参数: ${JSON.stringify(params)}`);
        return { status: 'mocked', message: '规划引擎尚未接入' };
      case JobTypeEnum.EXPORT:
        // TODO: 接入导出逻辑
        this.logger.log(`[占位] 导出任务，参数: ${JSON.stringify(params)}`);
        return { status: 'mocked', message: '导出逻辑尚未接入' };
      case JobTypeEnum.NOTIFICATION:
        this.logger.log(`[占位] 通知任务，参数: ${JSON.stringify(params)}`);
        return { status: 'mocked' };
      case JobTypeEnum.AI_CALL:
        this.logger.log(`[占位] AI 调用任务，参数: ${JSON.stringify(params)}`);
        return { status: 'mocked' };
      case JobTypeEnum.REPLAN:
      case JobTypeEnum.KNOWLEDGE_INDEX:
      case JobTypeEnum.CLEANUP:
        this.logger.log(`[占位] ${type} 任务，参数: ${JSON.stringify(params)}`);
        return { status: 'mocked' };
      case JobTypeEnum.SESSION_CLEANUP: {
        const deleted = await this.cleanupExpiredSessions();
        return { status: 'ok', deleted };
      }
      default:
        throw new Error(`未知的任务类型: ${type}`);
    }
  }

  /**
   * 清理过期 Session（expiresAt < now）
   * 定期执行，防止 Session 表无限增长
   * @returns 删除的记录数
   */
  private async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      const result = await this.prisma.session.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      if (result.count > 0) {
        this.logger.log(`Session 清理完成：删除 ${result.count} 条过期会话`);
      }
      return result.count;
    } catch (error) {
      this.logger.error(
        `Session 清理失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }
}

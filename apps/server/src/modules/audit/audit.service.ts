import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  AUDIT_ACTION_LABELS,
  AuditActionEnum,
  AuditResultEnum,
  normalizePagination,
  type AuditLogQueryDto,
  type AuditLogResponseDto,
  type AuditStatsDto,
  type CreateAuditLogParams,
} from '@ai-task-manager/shared';

/**
 * 审计日志服务
 * 参考：12_安全监控指标与发布治理实施清单.md §1
 *
 * 设计：
 * - 记录关键操作（登录/配置变更/删除/导出/分享等）
 * - 异步写入，不阻断主流程
 * - 不记录请求体/响应体中的敏感字段
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录审计日志（异步，不抛错）
   */
  async record(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId ?? null,
          actorEmail: params.actorEmail ?? null,
          action: params.action,
          resourceType: params.resourceType ?? null,
          resourceId: params.resourceId ?? null,
          result: params.result ?? AuditResultEnum.SUCCESS,
          errorMessage: params.errorMessage ?? null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          method: params.method ?? null,
          path: params.path ?? null,
          detail: params.detail ? JSON.stringify(params.detail) : null,
        },
      });
    } catch (err) {
      // 审计日志写入失败不阻断主流程，仅记录错误
      this.logger.error(
        `审计日志写入失败: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  /**
   * 查询审计日志（分页）
   */
  async findAll(query: AuditLogQueryDto): Promise<{
    items: AuditLogResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page, pageSize, skip, take } = normalizePagination(query);

    const where = this.buildWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((i) => this.toResponse(i)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 查询单条审计日志
   */
  async findOne(id: string): Promise<AuditLogResponseDto | null> {
    const item = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!item) {
      return null;
    }
    return this.toResponse(item);
  }

  /**
   * 审计统计
   */
  async getStats(days = 7): Promise<AuditStatsDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalActions, totalSuccess, totalFailure, byActionRaw, byResourceTypeRaw, byDayRaw, recentFailures] =
      await Promise.all([
        this.prisma.auditLog.count({ where: { createdAt: { gte: startDate } } }),
        this.prisma.auditLog.count({
          where: { createdAt: { gte: startDate }, result: AuditResultEnum.SUCCESS },
        }),
        this.prisma.auditLog.count({
          where: { createdAt: { gte: startDate }, result: AuditResultEnum.FAILURE },
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where: { createdAt: { gte: startDate } },
          _count: { _all: true },
        }),
        this.prisma.auditLog.groupBy({
          by: ['resourceType'],
          where: { createdAt: { gte: startDate } },
          _count: { _all: true },
        }),
        this.prisma.auditLog.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true, result: true },
        }),
        this.prisma.auditLog.findMany({
          where: { createdAt: { gte: startDate }, result: AuditResultEnum.FAILURE },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            action: true,
            actorEmail: true,
            errorMessage: true,
            createdAt: true,
          },
        }),
      ]);

    // 按动作统计（含成功/失败计数）
    const actionSuccessMap = new Map<string, number>();
    const actionFailureMap = new Map<string, number>();
    const allActions = await this.prisma.auditLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { action: true, result: true },
    });
    for (const a of allActions) {
      if (a.result === AuditResultEnum.SUCCESS) {
        actionSuccessMap.set(a.action, (actionSuccessMap.get(a.action) ?? 0) + 1);
      } else {
        actionFailureMap.set(a.action, (actionFailureMap.get(a.action) ?? 0) + 1);
      }
    }

    // 按日统计
    const dayMap = new Map<string, { count: number; failureCount: number }>();
    for (const r of byDayRaw) {
      const day = r.createdAt.toISOString().slice(0, 10);
      const cur = dayMap.get(day) ?? { count: 0, failureCount: 0 };
      cur.count += 1;
      if (r.result === AuditResultEnum.FAILURE) cur.failureCount += 1;
      dayMap.set(day, cur);
    }

    return {
      days,
      totalActions,
      totalSuccess,
      totalFailure,
      byAction: byActionRaw.map((b) => ({
        action: b.action,
        count: b._count._all,
        successCount: actionSuccessMap.get(b.action) ?? 0,
        failureCount: actionFailureMap.get(b.action) ?? 0,
      })),
      byResourceType: byResourceTypeRaw
        .filter((b) => b.resourceType !== null)
        .map((b) => ({
          resourceType: b.resourceType as string,
          count: b._count._all,
        })),
      byDay: Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, ...v })),
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        action: f.action,
        actorEmail: f.actorEmail,
        errorMessage: f.errorMessage,
        createdAt: f.createdAt.toISOString(),
      })),
    };
  }

  /**
   * 清理过期审计日志（保留最近 N 天）
   */
  async cleanup(retentionDays = 90): Promise<{ deleted: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    this.logger.log(`清理 ${result.count} 条过期审计日志（>${retentionDays} 天）`);
    return { deleted: result.count };
  }

  private buildWhere(query: AuditLogQueryDto) {
    const where: {
      actorId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      result?: string;
      createdAt?: { gte?: Date; lte?: Date };
      OR?: Array<Record<string, unknown>>;
    } = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.result) where.result = query.result;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    if (query.keyword) {
      where.OR = [
        { actorEmail: { contains: query.keyword } },
        { path: { contains: query.keyword } },
        { errorMessage: { contains: query.keyword } },
      ];
    }
    return where;
  }

  private toResponse(item: {
    id: string;
    actorId: string | null;
    actorEmail: string | null;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    result: string;
    errorMessage: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    method: string | null;
    path: string | null;
    detail: string | null;
    createdAt: Date;
  }): AuditLogResponseDto {
    let detail: Record<string, unknown> | null = null;
    if (item.detail) {
      try {
        detail = JSON.parse(item.detail);
      } catch {
        detail = null;
      }
    }
    return {
      id: item.id,
      actorId: item.actorId,
      actorEmail: item.actorEmail,
      action: item.action as AuditActionEnum,
      actionLabel: AUDIT_ACTION_LABELS[item.action as AuditActionEnum] ?? item.action,
      resourceType: item.resourceType as AuditLogResponseDto['resourceType'],
      resourceId: item.resourceId,
      result: item.result as AuditResultEnum,
      errorMessage: item.errorMessage,
      ipAddress: item.ipAddress,
      userAgent: item.userAgent,
      method: item.method,
      path: item.path,
      detail,
      createdAt: item.createdAt.toISOString(),
    };
  }
}

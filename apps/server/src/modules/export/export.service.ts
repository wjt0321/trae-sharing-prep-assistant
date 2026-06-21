import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  ApiError,
  ErrorCode,
  ExportTypeEnum,
  ExportFormatEnum,
  ExportStatusEnum,
  EXPORT_TYPE_LABELS,
  GOAL_STAGE_LABELS,
  type ExportResponseDto,
  type ExportListItemDto,
  type SharePageResponseDto,
  type ExportContextDto,
  type PlanContent,
} from '@ai-task-manager/shared';
import { ExportTemplateGenerator } from './export-template.generator';
import { GoalPermissionService } from '../goal/goal-permission.service';
import type { CreateExportDto } from './dto/create-export.dto';
import type { UpdateShareSettingsDto } from './dto/update-share-settings.dto';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly goalPermissionService: GoalPermissionService,
  ) {}

  // ============================================================
  // 创建导出
  // ============================================================

  async create(goalId: string, dto: CreateExportDto, userId: string): Promise<ExportResponseDto> {
    const goal = await this.goalPermissionService.getGoalWithMembershipCheck(goalId, userId);

    // 聚合上下文
    const ctx = await this.buildExportContext(goal);

    // 生成 Markdown
    const content = ExportTemplateGenerator.generate(dto.type, ctx);

    const title = dto.title || `${goal.title || goal.topic} · ${EXPORT_TYPE_LABELS[dto.type]}`;

    const record = await this.prisma.exportRecord.create({
      data: {
        goalId: goal.id,
        type: dto.type,
        format: dto.format,
        title,
        content,
        status: ExportStatusEnum.SUCCEEDED,
        creatorId: userId,
      },
    });

    this.logger.log(`导出已创建: ${record.id} (goal=${goal.id}, type=${dto.type})`);
    return this.toExportResponse(record);
  }

  // ============================================================
  // 查询
  // ============================================================

  async findAll(goalId: string, userId: string): Promise<ExportListItemDto[]> {
    const goal = await this.goalPermissionService.getGoalWithMembershipCheck(goalId, userId);
    const records = await this.prisma.exportRecord.findMany({
      where: { goalId: goal.id },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toListItem(r));
  }

  async findOne(id: string, userId: string): Promise<ExportResponseDto> {
    const record = await this.prisma.exportRecord.findUnique({ where: { id } });
    if (!record) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '导出记录不存在' });
    }
    await this.goalPermissionService.getGoalWithMembershipCheck(record.goalId, userId);
    return this.toExportResponse(record);
  }

  // ============================================================
  // 共享页（公开访问）
  // ============================================================

  async findByShareToken(token: string): Promise<SharePageResponseDto> {
    const record = await this.prisma.exportRecord.findUnique({
      where: { shareToken: token },
    });
    if (!record) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '分享链接无效或已失效' });
    }

    const isExpired = record.shareExpiresAt
      ? new Date(record.shareExpiresAt).getTime() < Date.now()
      : false;
    if (isExpired) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '分享链接已过期' });
    }

    const goal = await this.prisma.goal.findUnique({
      where: { id: record.goalId },
      select: { title: true, topic: true, scenarioType: true },
    });

    return {
      title: record.title,
      type: record.type as ExportTypeEnum,
      typeLabel: EXPORT_TYPE_LABELS[record.type as ExportTypeEnum] ?? record.type,
      content: record.content,
      format: record.format as ExportFormatEnum,
      allowDownload: record.allowDownload,
      goalTitle: goal?.title || goal?.topic || '未知目标',
      scenarioType: goal?.scenarioType ?? null,
      createdAt: record.createdAt.toISOString(),
      isExpired: false,
    };
  }

  // ============================================================
  // 分享设置管理
  // ============================================================

  async updateShareSettings(
    id: string,
    dto: UpdateShareSettingsDto,
    userId: string,
  ): Promise<ExportResponseDto> {
    const record = await this.prisma.exportRecord.findUnique({ where: { id } });
    if (!record) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '导出记录不存在' });
    }
    await this.goalPermissionService.getGoalWithMembershipCheck(record.goalId, userId);

    const data: Record<string, unknown> = {};

    if (dto.enableShare !== undefined) {
      if (dto.enableShare && !record.shareToken) {
        data.shareToken = this.generateShareToken();
      } else if (!dto.enableShare) {
        data.shareToken = null;
        data.shareExpiresAt = null;
      }
    }

    if (dto.shareExpiresAt !== undefined) {
      data.shareExpiresAt = dto.shareExpiresAt
        ? new Date(dto.shareExpiresAt)
        : null;
    }

    if (dto.allowDownload !== undefined) {
      data.allowDownload = dto.allowDownload;
    }

    const updated = await this.prisma.exportRecord.update({ where: { id }, data });
    this.logger.log(`分享设置已更新: ${id} (enableShare=${dto.enableShare})`);
    return this.toExportResponse(updated);
  }

  // ============================================================
  // 删除导出
  // ============================================================

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const record = await this.prisma.exportRecord.findUnique({ where: { id } });
    if (!record) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '导出记录不存在' });
    }
    await this.goalPermissionService.getGoalWithMembershipCheck(record.goalId, userId);

    await this.prisma.exportRecord.delete({ where: { id } });
    return { success: true };
  }

  // ============================================================
  // 私有辅助
  // ============================================================

  private async buildExportContext(goal: {
    id: string;
    title: string | null;
    topic: string;
    scenarioType: string | null;
    currentStage: string;
    successCriteria: string | null;
    timeConstraint: string | null;
    resourceConstraint: string | null;
    priority: string | null;
    workspaceId: string;
  }): Promise<ExportContextDto> {
    // 读取活跃规划
    const activePlan = await this.prisma.plan.findFirst({
      where: { goalId: goal.id, isActive: true },
      orderBy: { version: 'desc' },
    });

    let planContent: PlanContent | null = null;
    let planVersion = 0;
    if (activePlan) {
      planContent = JSON.parse(activePlan.content) as PlanContent;
      planVersion = activePlan.version;
    }

    // 读取执行任务（过滤软删除）
    const tasks = await this.prisma.executionTask.findMany({
      where: { goalId: goal.id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      goal: {
        id: goal.id,
        title: goal.title || goal.topic,
        topic: goal.topic,
        scenarioType: goal.scenarioType,
        currentStage: goal.currentStage as ExportContextDto['goal']['currentStage'],
        successCriteria: goal.successCriteria,
        timeConstraint: goal.timeConstraint,
        resourceConstraint: goal.resourceConstraint,
        priority: goal.priority,
      },
      plan: {
        version: planVersion,
        content: planContent,
      },
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        stageName: t.stageName,
        dueDate: t.dueDate?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        blockerNote: t.blockerNote,
      })),
      progress: {
        totalTasks,
        completedTasks,
        completionRate,
        blockedTasks,
        inProgressTasks,
      },
    };
  }

  private generateShareToken(): string {
    return randomBytes(16).toString('hex');
  }

  private isShareActive(record: {
    shareToken: string | null;
    shareExpiresAt: Date | null;
  }): boolean {
    if (!record.shareToken) return false;
    if (record.shareExpiresAt) {
      return new Date(record.shareExpiresAt).getTime() > Date.now();
    }
    return true;
  }

  private toExportResponse(record: {
    id: string;
    goalId: string;
    type: string;
    format: string;
    title: string;
    content: string;
    status: string;
    errorMessage: string | null;
    shareToken: string | null;
    shareExpiresAt: Date | null;
    allowDownload: boolean;
    creatorId: string;
    createdAt: Date;
    updatedAt: Date;
  }): ExportResponseDto {
    return {
      id: record.id,
      goalId: record.goalId,
      type: record.type as ExportTypeEnum,
      format: record.format as ExportFormatEnum,
      title: record.title,
      content: record.content,
      status: record.status as ExportStatusEnum,
      errorMessage: record.errorMessage,
      shareToken: record.shareToken,
      shareExpiresAt: record.shareExpiresAt?.toISOString() ?? null,
      allowDownload: record.allowDownload,
      creatorId: record.creatorId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      isShareActive: this.isShareActive(record),
    };
  }

  private toListItem(record: {
    id: string;
    goalId: string;
    type: string;
    format: string;
    title: string;
    status: string;
    shareToken: string | null;
    shareExpiresAt: Date | null;
    createdAt: Date;
  }): ExportListItemDto {
    return {
      id: record.id,
      goalId: record.goalId,
      type: record.type as ExportTypeEnum,
      format: record.format as ExportFormatEnum,
      title: record.title,
      status: record.status as ExportStatusEnum,
      shareToken: record.shareToken,
      shareExpiresAt: record.shareExpiresAt?.toISOString() ?? null,
      isShareActive: this.isShareActive(record),
      createdAt: record.createdAt.toISOString(),
    };
  }
}

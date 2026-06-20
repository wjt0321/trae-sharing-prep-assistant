import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  ApiError,
  ErrorCode,
  TemplateCategoryEnum,
  KnowledgeAssetTypeEnum,
  ScenarioTypeEnum,
  TEMPLATE_CATEGORY_LABELS,
  KNOWLEDGE_ASSET_TYPE_LABELS,
  type TemplateResponseDto,
  type TemplateListItemDto,
  type TemplateContentDto,
  type CreateGoalFromTemplateResponseDto,
  type KnowledgeAssetResponseDto,
  type KnowledgeAssetListItemDto,
} from '@ai-task-manager/shared';
import type { CreateTemplateDto } from './dto/knowledge.dto';
import type { UpdateTemplateDto } from './dto/knowledge.dto';
import type { CreateTemplateFromGoalDto } from './dto/knowledge.dto';
import type { CreateAssetDto } from './dto/knowledge.dto';
import type { UpdateAssetDto } from './dto/knowledge.dto';
import type { CreateAssetFromExportDto } from './dto/knowledge.dto';
import type { TemplateListQueryDto } from './dto/knowledge.dto';
import type { AssetListQueryDto } from './dto/knowledge.dto';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 模板 CRUD
  // ============================================================

  async findAllTemplates(
    workspaceId: string,
    userId: string,
    query: TemplateListQueryDto,
  ): Promise<TemplateListItemDto[]> {
    await this.requireMembership(workspaceId, userId);

    const where: Record<string, unknown> = { workspaceId };
    if (query.category) where.category = query.category;
    if (query.scenarioType) where.scenarioType = query.scenarioType;
    if (query.builtInOnly !== undefined) where.isBuiltIn = query.builtInOnly;
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { description: { contains: query.keyword } },
      ];
    }

    const templates = await this.prisma.template.findMany({
      where,
      orderBy: [{ isBuiltIn: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
    });

    return templates.map((t) => this.toTemplateListItem(t));
  }

  async createTemplate(
    workspaceId: string,
    userId: string,
    dto: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    await this.requireMembership(workspaceId, userId);

    // 场景模板必须关联场景类型
    if (dto.category === TemplateCategoryEnum.SCENARIO && !dto.scenarioType) {
      throw new ApiError(ErrorCode.BAD_REQUEST, {
        message: '场景模板必须指定 scenarioType',
      });
    }

    const template = await this.prisma.template.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        scenarioType: dto.scenarioType ?? null,
        content: JSON.stringify(dto.content),
        isBuiltIn: dto.isBuiltIn ?? false,
        createdBy: userId,
      },
    });

    this.logger.log(`模板已创建: ${template.id} (workspace=${workspaceId})`);
    return this.toTemplateResponse(template);
  }

  async findOneTemplate(id: string, userId: string): Promise<TemplateResponseDto> {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) {
      throw new ApiError(ErrorCode.KNOWLEDGE_TEMPLATE_NOT_FOUND);
    }
    await this.requireMembership(template.workspaceId, userId);
    return this.toTemplateResponse(template);
  }

  async updateTemplate(
    id: string,
    userId: string,
    dto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) {
      throw new ApiError(ErrorCode.KNOWLEDGE_TEMPLATE_NOT_FOUND);
    }
    await this.requireMembership(template.workspaceId, userId);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.scenarioType !== undefined) data.scenarioType = dto.scenarioType;
    if (dto.content !== undefined) data.content = JSON.stringify(dto.content);

    const updated = await this.prisma.template.update({ where: { id }, data });
    this.logger.log(`模板已更新: ${id}`);
    return this.toTemplateResponse(updated);
  }

  async removeTemplate(id: string, userId: string): Promise<{ success: boolean }> {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) {
      throw new ApiError(ErrorCode.KNOWLEDGE_TEMPLATE_NOT_FOUND);
    }
    await this.requireMembership(template.workspaceId, userId);

    // 内置模板不允许删除
    if (template.isBuiltIn) {
      throw new ApiError(ErrorCode.BAD_REQUEST, {
        message: '内置模板不允许删除',
      });
    }

    await this.prisma.template.delete({ where: { id } });
    this.logger.log(`模板已删除: ${id}`);
    return { success: true };
  }

  // ============================================================
  // 从目标创建模板
  // ============================================================

  async createTemplateFromGoal(
    goalId: string,
    userId: string,
    dto: CreateTemplateFromGoalDto,
  ): Promise<TemplateResponseDto> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);

    // 从目标字段构造模板内容
    const content: TemplateContentDto = {
      topic: goal.topic,
      title: goal.title ?? undefined,
      scenarioType: (goal.scenarioType as ScenarioTypeEnum) ?? undefined,
      audience: goal.audience ?? undefined,
      duration: goal.duration ?? undefined,
      shareDate: goal.shareDate?.toISOString().split('T')[0] ?? undefined,
      timeConstraint: goal.timeConstraint ?? undefined,
      resourceConstraint: goal.resourceConstraint ?? undefined,
      priority: (goal.priority as TemplateContentDto['priority']) ?? undefined,
      successCriteria: goal.successCriteria ?? undefined,
      isCollaborative: goal.isCollaborative ?? undefined,
      sceneTags: goal.sceneTags ?? undefined,
      description: `从目标「${goal.title || goal.topic}」沉淀`,
    };

    const template = await this.prisma.template.create({
      data: {
        workspaceId: goal.workspaceId,
        name: dto.name || `${goal.title || goal.topic} · 模板`,
        description: dto.description ?? content.description ?? null,
        category: dto.category ?? TemplateCategoryEnum.PERSONAL,
        scenarioType: goal.scenarioType,
        content: JSON.stringify(content),
        isBuiltIn: false,
        createdBy: userId,
      },
    });

    this.logger.log(
      `从目标 ${goalId} 创建模板: ${template.id} (workspace=${goal.workspaceId})`,
    );
    return this.toTemplateResponse(template);
  }

  // ============================================================
  // 从模板创建目标（返回预填字段，前端灌入表单）
  // ============================================================

  async getTemplateForGoal(
    templateId: string,
    userId: string,
  ): Promise<CreateGoalFromTemplateResponseDto> {
    const template = await this.prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      throw new ApiError(ErrorCode.KNOWLEDGE_TEMPLATE_NOT_FOUND);
    }
    await this.requireMembership(template.workspaceId, userId);

    // 增加使用次数
    await this.prisma.template.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    const content = this.parseContent(template.content);
    const templateResponse = this.toTemplateResponse(template);

    return {
      template: templateResponse,
      prefilledFields: {
        topic: content.topic,
        title: content.title,
        scenarioType: content.scenarioType,
        audience: content.audience,
        duration: content.duration,
        shareDate: content.shareDate,
        timeConstraint: content.timeConstraint,
        resourceConstraint: content.resourceConstraint,
        priority: content.priority,
        successCriteria: content.successCriteria,
        isCollaborative: content.isCollaborative,
        sceneTags: content.sceneTags,
      },
      planHints: content.planHints,
      riskHints: content.riskHints,
      checklist: content.checklist,
    };
  }

  // ============================================================
  // 知识资产 CRUD
  // ============================================================

  async findAllAssets(
    workspaceId: string,
    userId: string,
    query: AssetListQueryDto,
  ): Promise<KnowledgeAssetListItemDto[]> {
    await this.requireMembership(workspaceId, userId);

    const where: Record<string, unknown> = { workspaceId };
    if (query.type) where.type = query.type;
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { content: { contains: query.keyword } },
      ];
    }
    if (query.tags) {
      const tags = query.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        where.OR = tags.map((tag) => ({ tags: { contains: tag } }));
      }
    }

    const assets = await this.prisma.knowledgeAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((a) => this.toAssetListItem(a));
  }

  async createAsset(
    workspaceId: string,
    userId: string,
    dto: CreateAssetDto,
  ): Promise<KnowledgeAssetResponseDto> {
    await this.requireMembership(workspaceId, userId);

    const asset = await this.prisma.knowledgeAsset.create({
      data: {
        workspaceId,
        title: dto.title,
        type: dto.type,
        content: dto.content,
        tags: dto.tags ?? null,
        sourceGoalId: dto.sourceGoalId ?? null,
        creatorId: userId,
      },
    });

    this.logger.log(`知识资产已创建: ${asset.id} (workspace=${workspaceId})`);
    return this.toAssetResponse(asset);
  }

  async findOneAsset(id: string, userId: string): Promise<KnowledgeAssetResponseDto> {
    const asset = await this.prisma.knowledgeAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new ApiError(ErrorCode.KNOWLEDGE_ASSET_NOT_FOUND);
    }
    await this.requireMembership(asset.workspaceId, userId);
    return this.toAssetResponse(asset);
  }

  async updateAsset(
    id: string,
    userId: string,
    dto: UpdateAssetDto,
  ): Promise<KnowledgeAssetResponseDto> {
    const asset = await this.prisma.knowledgeAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new ApiError(ErrorCode.KNOWLEDGE_ASSET_NOT_FOUND);
    }
    await this.requireMembership(asset.workspaceId, userId);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.tags !== undefined) data.tags = dto.tags;

    const updated = await this.prisma.knowledgeAsset.update({ where: { id }, data });
    this.logger.log(`知识资产已更新: ${id}`);
    return this.toAssetResponse(updated);
  }

  async removeAsset(id: string, userId: string): Promise<{ success: boolean }> {
    const asset = await this.prisma.knowledgeAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new ApiError(ErrorCode.KNOWLEDGE_ASSET_NOT_FOUND);
    }
    await this.requireMembership(asset.workspaceId, userId);

    await this.prisma.knowledgeAsset.delete({ where: { id } });
    this.logger.log(`知识资产已删除: ${id}`);
    return { success: true };
  }

  // ============================================================
  // 从导出沉淀为知识资产
  // ============================================================

  async createAssetFromExport(
    exportId: string,
    userId: string,
    dto: CreateAssetFromExportDto,
  ): Promise<KnowledgeAssetResponseDto> {
    const exportRecord = await this.prisma.exportRecord.findUnique({
      where: { id: exportId },
    });
    if (!exportRecord) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '导出记录不存在' });
    }
    await this.getGoalWithMembershipCheck(exportRecord.goalId, userId);

    const goal = await this.prisma.goal.findUnique({
      where: { id: exportRecord.goalId },
      select: { workspaceId: true, title: true, topic: true },
    });

    const asset = await this.prisma.knowledgeAsset.create({
      data: {
        workspaceId: goal!.workspaceId,
        title: dto.title || `${exportRecord.title} · 案例`,
        type: dto.type ?? KnowledgeAssetTypeEnum.CASE,
        content: exportRecord.content,
        tags: dto.tags ?? null,
        sourceGoalId: exportRecord.goalId,
        creatorId: userId,
      },
    });

    this.logger.log(
      `从导出 ${exportId} 沉淀为知识资产: ${asset.id} (workspace=${goal!.workspaceId})`,
    );
    return this.toAssetResponse(asset);
  }

  // ============================================================
  // 私有辅助
  // ============================================================

  private async requireMembership(workspaceId: string, userId: string): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: '你不是该工作区的成员',
      });
    }
  }

  private async getGoalWithMembershipCheck(goalId: string, userId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, deletedAt: null },
    });
    if (!goal) {
      throw new ApiError(ErrorCode.GOAL_NOT_FOUND);
    }
    await this.requireMembership(goal.workspaceId, userId);
    return goal;
  }

  private parseContent(contentStr: string): TemplateContentDto {
    try {
      return JSON.parse(contentStr) as TemplateContentDto;
    } catch {
      this.logger.warn(`模板内容解析失败，返回空对象: ${contentStr}`);
      return {};
    }
  }

  private splitTags(tags: string | null): string[] {
    if (!tags) return [];
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  private toTemplateResponse(template: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    category: string;
    scenarioType: string | null;
    content: string;
    isBuiltIn: boolean;
    usageCount: number;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): TemplateResponseDto {
    return {
      id: template.id,
      workspaceId: template.workspaceId,
      name: template.name,
      description: template.description,
      category: template.category as TemplateCategoryEnum,
      scenarioType: (template.scenarioType as ScenarioTypeEnum) ?? null,
      content: this.parseContent(template.content),
      isBuiltIn: template.isBuiltIn,
      usageCount: template.usageCount,
      createdBy: template.createdBy,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  private toTemplateListItem(template: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    scenarioType: string | null;
    isBuiltIn: boolean;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
  }): TemplateListItemDto {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category as TemplateCategoryEnum,
      scenarioType: (template.scenarioType as ScenarioTypeEnum) ?? null,
      isBuiltIn: template.isBuiltIn,
      usageCount: template.usageCount,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  private toAssetResponse(asset: {
    id: string;
    workspaceId: string;
    title: string;
    type: string;
    content: string;
    tags: string | null;
    sourceGoalId: string | null;
    creatorId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): KnowledgeAssetResponseDto {
    return {
      id: asset.id,
      workspaceId: asset.workspaceId,
      title: asset.title,
      type: asset.type as KnowledgeAssetTypeEnum,
      content: asset.content,
      tags: asset.tags,
      tagList: this.splitTags(asset.tags),
      sourceGoalId: asset.sourceGoalId,
      creatorId: asset.creatorId,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  private toAssetListItem(asset: {
    id: string;
    title: string;
    type: string;
    content: string;
    tags: string | null;
    sourceGoalId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): KnowledgeAssetListItemDto {
    return {
      id: asset.id,
      title: asset.title,
      type: asset.type as KnowledgeAssetTypeEnum,
      tags: asset.tags,
      tagList: this.splitTags(asset.tags),
      sourceGoalId: asset.sourceGoalId,
      summary: asset.content.length > 120 ? asset.content.slice(0, 120) + '…' : asset.content,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }
}

// 防止未使用导入告警（LABELS 在响应拦截器或前端使用，这里保留导出引用）
void TEMPLATE_CATEGORY_LABELS;
void KNOWLEDGE_ASSET_TYPE_LABELS;

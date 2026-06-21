import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ApiError, ErrorCode, type PromptTemplateDto, type RenderedPromptDto } from '@ai-task-manager/shared';

/**
 * 提示词模板服务（Prompt Registry）
 *
 * 职责：
 * - 管理提示词模板的 CRUD（按 name 索引，支持版本号）
 * - 渲染模板（替换 {{var}} 占位符）
 * - 提供给 AiGateway 按名称查找活跃模板
 *
 * 设计：
 * - 同一 name 可有多个版本，但只有一个 isActive=true
 * - 更新时创建新版本（version 自增），旧版本自动设为非活跃
 * - userTemplate 支持 {{var}} 占位符
 */
@Injectable()
export class PromptRegistryService {
  private readonly logger = new Logger(PromptRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 列出所有活跃模板（每个 name 只返回当前活跃版本） */
  async listActive(): Promise<PromptTemplateDto[]> {
    const templates = await this.prisma.promptTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return templates.map((t) => this.toDto(t));
  }

  /** 列出某 name 的所有版本 */
  async listVersions(name: string): Promise<PromptTemplateDto[]> {
    const templates = await this.prisma.promptTemplate.findMany({
      where: { name },
      orderBy: { version: 'desc' },
    });
    return templates.map((t) => this.toDto(t));
  }

  /** 按 name 获取当前活跃版本 */
  async getActiveByName(name: string): Promise<PromptTemplateDto | null> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { name, isActive: true },
    });
    return template ? this.toDto(template) : null;
  }

  /** 按 id 获取 */
  async getById(id: string): Promise<PromptTemplateDto> {
    const template = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '提示词模板不存在' });
    }
    return this.toDto(template);
  }

  /** 创建模板（若 name 已存在，创建新版本并激活） */
  async create(dto: {
    name: string;
    description?: string;
    systemPrompt: string;
    userTemplate: string;
    variables?: string[];
  }): Promise<PromptTemplateDto> {
    const variablesJson = JSON.stringify(dto.variables ?? []);

    // 查找该 name 的最大版本号
    const existing = await this.prisma.promptTemplate.findFirst({
      where: { name: dto.name },
      orderBy: { version: 'desc' },
    });

    if (existing) {
      // 创建新版本
      const newVersion = existing.version + 1;
      // 在事务中确保同一 name 只有一个 isActive=true
      const created = await this.prisma.$transaction(async (tx) => {
        // 先把旧版本设为非活跃
        await tx.promptTemplate.updateMany({
          where: { name: dto.name, isActive: true },
          data: { isActive: false },
        });
        return tx.promptTemplate.create({
          data: {
            name: dto.name,
            description: dto.description ?? null,
            systemPrompt: dto.systemPrompt,
            userTemplate: dto.userTemplate,
            variablesJson,
            version: newVersion,
            isActive: true,
          },
        });
      });
      this.logger.log(`提示词模板已创建新版本: ${dto.name} v${newVersion}`);
      return this.toDto(created);
    }

    // 全新模板
    const created = await this.prisma.promptTemplate.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        systemPrompt: dto.systemPrompt,
        userTemplate: dto.userTemplate,
        variablesJson,
        version: 1,
        isActive: true,
      },
    });
    this.logger.log(`提示词模板已创建: ${dto.name} v1`);
    return this.toDto(created);
  }

  /** 更新模板（等价于创建新版本） */
  async update(id: string, dto: {
    description?: string;
    systemPrompt?: string;
    userTemplate?: string;
    variables?: string[];
  }): Promise<PromptTemplateDto> {
    const existing = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '提示词模板不存在' });
    }

    const variablesJson = dto.variables
      ? JSON.stringify(dto.variables)
      : existing.variablesJson;

    // 创建新版本
    const newVersion = existing.version + 1;
    // 在事务中确保同一 name 只有一个 isActive=true
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.promptTemplate.updateMany({
        where: { name: existing.name, isActive: true },
        data: { isActive: false },
      });
      return tx.promptTemplate.create({
        data: {
          name: existing.name,
          description: dto.description ?? existing.description,
          systemPrompt: dto.systemPrompt ?? existing.systemPrompt,
          userTemplate: dto.userTemplate ?? existing.userTemplate,
          variablesJson,
          version: newVersion,
          isActive: true,
        },
      });
    });

    this.logger.log(`提示词模板已更新: ${existing.name} v${newVersion}`);
    return this.toDto(created);
  }

  /** 激活指定版本 */
  async activate(id: string): Promise<PromptTemplateDto> {
    const template = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '提示词模板不存在' });
    }
    // 在事务中确保同一 name 只有一个 isActive=true
    const updated = await this.prisma.$transaction(async (tx) => {
      // 先把同 name 的其他版本设为非活跃
      await tx.promptTemplate.updateMany({
        where: { name: template.name, isActive: true },
        data: { isActive: false },
      });
      return tx.promptTemplate.update({
        where: { id },
        data: { isActive: true },
      });
    });
    this.logger.log(`提示词模板已激活: ${template.name} v${template.version}`);
    return this.toDto(updated);
  }

  /** 删除指定版本（若删除的是活跃版本，自动激活最新剩余版本） */
  async delete(id: string): Promise<{ deleted: boolean }> {
    const template = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '提示词模板不存在' });
    }
    await this.prisma.promptTemplate.delete({ where: { id } });

    // 若删除的是活跃版本，激活剩余的最新版本
    if (template.isActive) {
      const latest = await this.prisma.promptTemplate.findFirst({
        where: { name: template.name },
        orderBy: { version: 'desc' },
      });
      if (latest) {
        await this.prisma.promptTemplate.update({
          where: { id: latest.id },
          data: { isActive: true },
        });
      }
    }
    this.logger.log(`提示词模板已删除: ${template.name} v${template.version}`);
    return { deleted: true };
  }

  /**
   * 渲染模板（供 AiGateway 调用）
   * 按 name 查找活跃版本，替换占位符，返回 messages
   */
  async renderForCall(
    name: string,
    variables: Record<string, string>,
  ): Promise<{ messages: Array<{ role: string; content: string }>; version: number } | null> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { name, isActive: true },
    });
    if (!template) {
      return null;
    }
    const messages = [
      { role: 'system', content: template.systemPrompt },
      { role: 'user', content: this.renderTemplate(template.userTemplate, variables) },
    ];
    return { messages, version: template.version };
  }

  /** 渲染预览（返回完整 DTO） */
  async render(name: string, variables: Record<string, string>): Promise<RenderedPromptDto> {
    const result = await this.renderForCall(name, variables);
    if (!result) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: `提示词模板 ${name} 不存在` });
    }
    return {
      name,
      version: result.version,
      messages: result.messages,
    };
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /** 替换 {{var}} 占位符 */
  private renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return variables[key] ?? match;
    });
  }

  /** Prisma 模型转 DTO */
  private toDto(t: {
    id: string;
    name: string;
    description: string | null;
    systemPrompt: string;
    userTemplate: string;
    variablesJson: string;
    version: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): PromptTemplateDto {
    let variables: string[] = [];
    try {
      variables = JSON.parse(t.variablesJson);
    } catch {
      variables = [];
    }
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      systemPrompt: t.systemPrompt,
      userTemplate: t.userTemplate,
      variables,
      version: t.version,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}

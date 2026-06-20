import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiGatewayService } from '../../infrastructure/ai-gateway/ai-gateway.service';
import { encrypt, maskApiKey, extractKeyHint } from '../../infrastructure/ai-gateway/crypto.util';
import {
  ApiError,
  ErrorCode,
  type AiProviderConfigDto,
  type UpdateAiProviderConfigDto,
  type TestAiConfigDto,
  type TestAiConfigResultDto,
  type AiCallStatsDto,
  type ModelStatDto,
  type DailyStatDto,
  type PromptStatDto,
} from '@ai-task-manager/shared';

/**
 * AI 网关配置服务
 *
 * 职责：
 * - 管理 AI 服务商配置（URL / API Key / 模型名）
 * - API Key 加密存储（AES-256-GCM），读取时掩码
 * - 配置由网页端设置，不硬编码在代码或环境变量中
 * - 测试连通性（不落库）
 */
@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);
  private readonly encryptionSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly aiGateway: AiGatewayService,
  ) {
    // 加密密钥优先取专用变量，回退到 JWT_SECRET
    this.encryptionSecret =
      this.configService.get<string>('AI_CONFIG_ENCRYPTION_KEY') ||
      this.configService.get<string>('JWT_SECRET', 'dev-secret-please-change');
  }

  /**
   * 获取当前配置（API Key 掩码，不泄露明文）
   */
  async getConfig(): Promise<AiProviderConfigDto> {
    const config = await this.prisma.aiProviderConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return {
        configured: false,
        provider: 'mock',
        baseUrl: '',
        modelName: '',
        apiKeyMasked: '',
        isActive: false,
        updatedAt: null,
      };
    }

    return {
      configured: true,
      provider: config.provider,
      baseUrl: config.baseUrl,
      modelName: config.modelName,
      apiKeyMasked: `****${config.apiKeyHint}`,
      isActive: config.isActive,
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  /**
   * 更新配置（加密 API Key 后落库，设为活跃）
   */
  async updateConfig(dto: UpdateAiProviderConfigDto): Promise<AiProviderConfigDto> {
    // 校验
    if (!dto.provider || !dto.baseUrl || !dto.apiKey || !dto.modelName) {
      throw new ApiError(ErrorCode.BAD_REQUEST, { message: '服务商、地址、API Key、模型名均不能为空' });
    }

    const apiKeyEnc = encrypt(dto.apiKey, this.encryptionSecret);
    const apiKeyHint = extractKeyHint(dto.apiKey);

    // 先将所有现有配置设为非活跃
    await this.prisma.aiProviderConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // 查找是否已有配置（单条记录模式，upsert）
    const existing = await this.prisma.aiProviderConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    let config;
    if (existing) {
      config = await this.prisma.aiProviderConfig.update({
        where: { id: existing.id },
        data: {
          provider: dto.provider,
          baseUrl: dto.baseUrl,
          apiKeyEnc,
          apiKeyHint,
          modelName: dto.modelName,
          isActive: true,
        },
      });
    } else {
      config = await this.prisma.aiProviderConfig.create({
        data: {
          provider: dto.provider,
          baseUrl: dto.baseUrl,
          apiKeyEnc,
          apiKeyHint,
          modelName: dto.modelName,
          isActive: true,
        },
      });
    }

    this.logger.log(`AI 网关配置已更新: provider=${config.provider}, model=${config.modelName}`);
    this.aiGateway.invalidateCache();

    return {
      configured: true,
      provider: config.provider,
      baseUrl: config.baseUrl,
      modelName: config.modelName,
      apiKeyMasked: `****${config.apiKeyHint}`,
      isActive: config.isActive,
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  /**
   * 清除配置（回退到 mock 模式）
   */
  async clearConfig(): Promise<{ cleared: boolean }> {
    await this.prisma.aiProviderConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    this.logger.log('AI 网关配置已清除，回退到 mock 模式');
    this.aiGateway.invalidateCache();
    return { cleared: true };
  }

  /**
   * 测试连通性（不落库，直接用传入的配置测试）
   */
  async testConnection(dto: TestAiConfigDto): Promise<TestAiConfigResultDto> {
    if (!dto.provider || !dto.baseUrl || !dto.apiKey || !dto.modelName) {
      throw new ApiError(ErrorCode.BAD_REQUEST, { message: '服务商、地址、API Key、模型名均不能为空' });
    }
    return this.aiGateway.testConnection(dto);
  }

  /**
   * 获取 AI 调用统计（成本统计）
   * 基于 AiCallLog 聚合，按模型定价估算成本。
   */
  async getStats(days: number): Promise<AiCallStatsDto> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.aiCallLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    // 按模型聚合
    const modelMap = new Map<string, ModelStatDto>();
    // 按日聚合
    const dayMap = new Map<string, DailyStatDto>();
    // 按提示词聚合
    const promptMap = new Map<string, { count: number; totalDuration: number }>();

    let totalCalls = 0;
    let totalSuccess = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let totalDuration = 0;

    for (const log of logs) {
      totalCalls++;
      if (log.success) totalSuccess++;
      totalInputTokens += log.inputTokens;
      totalOutputTokens += log.outputTokens;
      totalDuration += log.durationMs;

      const cost = this.estimateCost(log.model, log.inputTokens, log.outputTokens);
      totalCostUsd += cost;

      // 按模型
      const modelStat = modelMap.get(log.model) ?? {
        model: log.model,
        callCount: 0,
        successCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
      modelStat.callCount++;
      if (log.success) modelStat.successCount++;
      modelStat.inputTokens += log.inputTokens;
      modelStat.outputTokens += log.outputTokens;
      modelStat.costUsd += cost;
      modelMap.set(log.model, modelStat);

      // 按日
      const dateStr = log.createdAt.toISOString().slice(0, 10);
      const dayStat = dayMap.get(dateStr) ?? {
        date: dateStr,
        callCount: 0,
        successCount: 0,
        costUsd: 0,
      };
      dayStat.callCount++;
      if (log.success) dayStat.successCount++;
      dayStat.costUsd += cost;
      dayMap.set(dateStr, dayStat);

      // 按提示词
      if (log.promptName) {
        const promptStat = promptMap.get(log.promptName) ?? { count: 0, totalDuration: 0 };
        promptStat.count++;
        promptStat.totalDuration += log.durationMs;
        promptMap.set(log.promptName, promptStat);
      }
    }

    const byPrompt: PromptStatDto[] = Array.from(promptMap.entries())
      .map(([name, stat]) => ({
        promptName: name,
        callCount: stat.count,
        avgDurationMs: stat.count > 0 ? Math.round(stat.totalDuration / stat.count) : 0,
      }))
      .sort((a, b) => b.callCount - a.callCount);

    return {
      days,
      totalCalls,
      totalSuccess,
      totalInputTokens,
      totalOutputTokens,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
      avgDurationMs: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
      byModel: Array.from(modelMap.values()).sort((a, b) => b.callCount - a.callCount),
      byDay: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      byPrompt,
    };
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 按模型估算成本（美元）
   * 定价表：每 1M token 的价格（input / output）
   * 数据来源：各模型官方定价页，2026-06 参考
   */
  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      // 未知模型（含 mock-model）不计成本
      return 0;
    }
    return (
      (inputTokens / 1_000_000) * pricing.inputPerMillion +
      (outputTokens / 1_000_000) * pricing.outputPerMillion
    );
  }
}

/**
 * 模型定价表（每 1M token，单位：美元）
 * 数据来源：各模型官方定价页，2026-06 参考
 * 未列出的模型（含 mock-model）不计成本
 */
const MODEL_PRICING: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-4-turbo': { inputPerMillion: 10, outputPerMillion: 30 },
  'gpt-4': { inputPerMillion: 30, outputPerMillion: 60 },
  'gpt-3.5-turbo': { inputPerMillion: 0.5, outputPerMillion: 1.5 },
  'claude-3-5-sonnet-20241022': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-3-5-haiku-20241022': { inputPerMillion: 0.8, outputPerMillion: 4 },
  'claude-3-opus-20240229': { inputPerMillion: 15, outputPerMillion: 75 },
  'deepseek-chat': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19 },
};

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
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AI 网关
 * 参考：11_后端平台数据层与AI基础设施实施清单.md
 *
 * 当前阶段：支持 mock 模式，先跑通调用链路
 * 后续升级：接入真实模型，增加 Prompt Registry、成本统计
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly provider: string;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.provider = configService.get<string>('AI_GATEWAY_PROVIDER', 'mock');
    this.model = configService.get<string>('AI_GATEWAY_MODEL', 'mock-model');
    this.logger.log(`AI 网关已初始化，provider=${this.provider}, model=${this.model}`);
  }

  /**
   * 统一 AI 调用入口
   * 所有 AI 调用必须经过此方法，便于日志记录与成本统计
   */
  async chat(params: {
    promptName: string;
    messages: Array<{ role: string; content: string }>;
    taskJobId?: string;
  }): Promise<{
    content: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | null = null;
    let result: { content: string; inputTokens: number; outputTokens: number; durationMs: number };

    try {
      if (this.provider === 'mock') {
        result = await this.mockChat(params);
      } else {
        // TODO: 接入真实模型 API
        result = await this.mockChat(params);
      }
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;
      await this.logCall({
        promptName: params.promptName,
        inputTokens: 0,
        outputTokens: 0,
        durationMs,
        success: false,
        errorMessage,
        taskJobId: params.taskJobId,
      });
      throw error;
    }

    await this.logCall({
      promptName: params.promptName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
      success,
      errorMessage,
      taskJobId: params.taskJobId,
    });

    return result;
  }

  /**
   * Mock 调用：返回固定占位内容，用于本地跑通流程
   */
  private async mockChat(params: {
    promptName: string;
    messages: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; inputTokens: number; outputTokens: number; durationMs: number }> {
    const startTime = Date.now();
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 100));

    const inputTokens = params.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    const mockContent = `[AI 网关 mock 响应] prompt=${params.promptName}, 已收到 ${params.messages.length} 条消息`;

    return {
      content: mockContent,
      inputTokens,
      outputTokens: Math.ceil(mockContent.length / 4),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 记录 AI 调用日志
   */
  private async logCall(params: {
    promptName: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    success: boolean;
    errorMessage: string | null;
    taskJobId?: string;
  }): Promise<void> {
    try {
      await this.prisma.aiCallLog.create({
        data: {
          model: this.model,
          promptName: params.promptName,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          durationMs: params.durationMs,
          success: params.success,
          errorMessage: params.errorMessage,
          taskJobId: params.taskJobId,
        },
      });
    } catch (error) {
      // 日志记录失败不应影响主流程
      this.logger.warn(`AI 调用日志记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

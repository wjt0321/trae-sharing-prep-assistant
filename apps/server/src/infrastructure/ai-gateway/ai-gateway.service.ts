import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from './crypto.util';
import type { TestAiConfigDto, TestAiConfigResultDto } from '@ai-task-manager/shared';

/**
 * AI 网关
 * 参考：11_后端平台数据层与AI基础设施实施清单.md
 *
 * 设计原则：
 * - 不硬编码：URL / API Key / 模型名从数据库读取（由网页端设置）
 * - 隐式存储：配置加密存入 SQLite，不落明文配置文件
 * - 不主动泄露：API Key 仅在实际调用时解密
 * - mock 回退：未配置或调用失败时回退到 mock 模式
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly encryptionSecret: string;
  private readonly defaultProvider: string;

  // 配置缓存（30 秒 TTL，避免每次调用都读库）
  private cachedConfig: ActiveConfig | null = null;
  private cachedAt = 0;
  private static readonly CACHE_TTL_MS = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.defaultProvider = this.configService.get<string>('AI_GATEWAY_PROVIDER', 'mock');
    // 专用加密密钥，不再回退到 JWT_SECRET
    this.encryptionSecret =
      this.configService.get<string>('AI_CONFIG_ENCRYPTION_KEY') ?? '';
    if (!this.encryptionSecret) {
      this.logger.warn(
        'AI_CONFIG_ENCRYPTION_KEY 未配置，AI 真实调用已禁用（回退到 mock 模式）。' +
          '请配置专用加密密钥后重启服务。',
      );
    }
    this.logger.log(`AI 网关已初始化，默认 provider=${this.defaultProvider}`);
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
      const config = await this.getActiveConfig();
      if (config) {
        result = await this.realChat(params, config);
      } else {
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
      // 真实调用失败时回退到 mock，保证主流程不中断
      this.logger.warn(`AI 调用失败，回退 mock: ${errorMessage}`);
      result = await this.mockChat(params);
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
   * 测试连通性（不落库，不读缓存，直接用传入配置测试）
   */
  async testConnection(dto: TestAiConfigDto): Promise<TestAiConfigResultDto> {
    const startTime = Date.now();
    try {
      const url = this.buildChatUrl(dto.baseUrl);
      const body = {
        model: dto.modelName,
        messages: [{ role: 'user', content: '请回复"连接成功"四个字。' }],
        max_tokens: 20,
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dto.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        return {
          connected: false,
          durationMs: Date.now() - startTime,
          sampleContent: '',
          errorMessage: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
        };
      }

      const data = await res.json();
      const sampleContent = data?.choices?.[0]?.message?.content ?? '(空响应)';

      return {
        connected: true,
        durationMs: Date.now() - startTime,
        sampleContent,
        errorMessage: null,
      };
    } catch (error) {
      return {
        connected: false,
        durationMs: Date.now() - startTime,
        sampleContent: '',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 使配置缓存失效（配置更新后由 AiConfigService 调用）
   */
  invalidateCache(): void {
    this.cachedConfig = null;
    this.cachedAt = 0;
  }

  /**
   * 流式 AI 调用（SSE）
   * 逐块 yield 内容，用于前端实时展示。
   * 真实模式：解析 OpenAI 兼容的 SSE 流；mock 模式：分块 yield 占位内容。
   */
  async *chatStream(params: {
    messages: Array<{ role: string; content: string }>;
  }): AsyncGenerator<string> {
    const config = await this.getActiveConfig();
    if (config) {
      try {
        yield* this.realChatStream(params, config);
        return;
      } catch (error) {
        // 真实流式调用失败，yield 错误提示后回退 mock
        this.logger.warn(`流式 AI 调用失败，回退 mock: ${error instanceof Error ? error.message : String(error)}`);
        yield* this.mockChatStream(params);
        return;
      }
    }
    yield* this.mockChatStream(params);
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 获取当前活跃配置（带缓存）
   * 返回解密后的 API Key，仅在本服务内部使用
   */
  private async getActiveConfig(): Promise<ActiveConfig | null> {
    // 加密密钥未配置时直接回退 mock
    if (!this.encryptionSecret) {
      return null;
    }

    const now = Date.now();
    if (this.cachedConfig && now - this.cachedAt < AiGatewayService.CACHE_TTL_MS) {
      return this.cachedConfig;
    }

    const config = await this.prisma.aiProviderConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      this.cachedConfig = null;
      this.cachedAt = now;
      return null;
    }

    try {
      const apiKey = decrypt(config.apiKeyEnc, this.encryptionSecret);
      this.cachedConfig = {
        provider: config.provider,
        baseUrl: config.baseUrl,
        apiKey,
        modelName: config.modelName,
      };
      this.cachedAt = now;
      return this.cachedConfig;
    } catch (error) {
      // 解密失败：可能是密钥已轮换但旧数据未迁移，提示用户重新配置
      this.logger.error(
        `API Key 解密失败，可能是加密密钥已变更。请通过密钥轮换脚本迁移或重新配置 API Key。` +
          ` 错误: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * 真实 AI 调用（OpenAI 兼容协议）
   * 429 / 5xx 自动重试（最多 3 次，指数退避：1s → 2s → 4s）
   */
  private async realChat(
    params: {
      promptName: string;
      messages: Array<{ role: string; content: string }>;
    },
    config: ActiveConfig,
  ): Promise<{ content: string; inputTokens: number; outputTokens: number; durationMs: number }> {
    const startTime = Date.now();
    const url = this.buildChatUrl(config.baseUrl);
    const body = {
      model: config.modelName,
      messages: params.messages,
    };

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60_000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          const errorMsg = `AI 调用失败 HTTP ${res.status}: ${errText.slice(0, 300)}`;

          // 429 (Rate Limit) 或 5xx (Server Error) 时重试
          if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            this.logger.warn(
              `AI 调用返回 ${res.status}，第 ${attempt + 1} 次重试（等待 ${backoffMs}ms）`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            lastError = new Error(errorMsg);
            continue;
          }

          throw new Error(errorMsg);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content ?? '';
        const inputTokens = data?.usage?.prompt_tokens ?? 0;
        const outputTokens = data?.usage?.completion_tokens ?? Math.ceil(content.length / 4);

        return {
          content,
          inputTokens,
          outputTokens,
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        // 网络错误 / 超时也重试
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `AI 调用异常，第 ${attempt + 1} 次重试（等待 ${backoffMs}ms）: ${error instanceof Error ? error.message : String(error)}`,
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('AI 调用重试次数已耗尽');
  }

  /**
   * 构建聊天接口 URL（兼容末尾带/或不带/的 baseUrl）
   */
  private buildChatUrl(baseUrl: string): string {
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${base}/chat/completions`;
  }

  /**
   * Mock 调用：返回固定占位内容，用于本地跑通流程
   */
  private async mockChat(params: {
    promptName: string;
    messages: Array<{ role: string; content: string }>;
  }): Promise<{ content: string; inputTokens: number; outputTokens: number; durationMs: number }> {
    const startTime = Date.now();
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
   * 真实流式调用（OpenAI 兼容协议，stream=true）
   * 解析 SSE 响应，逐块 yield content delta
   */
  private async *realChatStream(
    params: {
      messages: Array<{ role: string; content: string }>;
    },
    config: ActiveConfig,
  ): AsyncGenerator<string> {
    const url = this.buildChatUrl(config.baseUrl);
    const body = {
      model: config.modelName,
      messages: params.messages,
      stream: true,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`AI 流式调用失败 HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    if (!res.body) {
      throw new Error('AI 流式调用返回空 body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // 按行解析 SSE
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } finally {
      // 安全释放 reader：先 cancel 取消流，再 releaseLock 释放锁
      // 避免 reader 仍持有流时 releaseLock 导致底层流无法正确关闭
      try {
        await reader.cancel();
      } catch {
        // cancel 可能因流已结束而抛错，忽略即可
      }
      reader.releaseLock();
    }
  }

  /**
   * Mock 流式调用：分块 yield 占位内容
   */
  private async *mockChatStream(params: {
    messages: Array<{ role: string; content: string }>;
  }): AsyncGenerator<string> {
    const mockContent = `[AI 网关 mock 流式响应] 已收到 ${params.messages.length} 条消息。`;
    // 按 2-3 字符分块，模拟流式效果
    const chunks = mockContent.match(/.{1,3}/g) ?? [mockContent];
    for (const chunk of chunks) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      yield chunk;
    }
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
          model: this.cachedConfig?.modelName ?? 'mock-model',
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
      this.logger.warn(`AI 调用日志记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/** 活跃配置（解密后，仅内存中存在） */
interface ActiveConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

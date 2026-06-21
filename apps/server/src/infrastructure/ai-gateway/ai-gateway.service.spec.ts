import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiGatewayService } from './ai-gateway.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AiGatewayService', () => {
  let service: AiGatewayService;
  let prismaService: jest.Mocked<Pick<PrismaService, 'aiProviderConfig' | 'aiCallLog'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    // Mock PrismaService
    const prismaMock = {
      aiProviderConfig: {
        findFirst: jest.fn(),
      },
      aiCallLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    // Mock ConfigService
    const configMock = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'AI_GATEWAY_PROVIDER') return 'mock';
        if (key === 'AI_CONFIG_ENCRYPTION_KEY') return ''; // 空密钥 → mock 模式
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGatewayService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<AiGatewayService>(AiGatewayService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  describe('mock 模式', () => {
    it('无加密密钥时回退到 mock 模式', async () => {
      const result = await service.chat({
        promptName: 'test-prompt',
        messages: [{ role: 'user', content: '你好' }],
      });

      expect(result.content).toContain('mock');
      expect(result.content).toContain('test-prompt');
      expect(typeof result.inputTokens).toBe('number');
      expect(typeof result.outputTokens).toBe('number');
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('mock 响应包含 prompt 名称', async () => {
      const result = await service.chat({
        promptName: 'scenario-detect',
        messages: [{ role: 'user', content: '准备一次分享' }],
      });
      expect(result.content).toContain('scenario-detect');
    });

    it('mock 响应包含消息数量', async () => {
      const result = await service.chat({
        promptName: 'test',
        messages: [
          { role: 'system', content: '你是助手' },
          { role: 'user', content: '你好' },
          { role: 'assistant', content: '你好！' },
        ],
      });
      expect(result.content).toContain('3');
    });

    it('mock 模式记录调用日志', async () => {
      await service.chat({
        promptName: 'test-prompt',
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(prismaService.aiCallLog.create).toHaveBeenCalled();
      const logCallArgs = (prismaService.aiCallLog.create as jest.Mock).mock.calls[0][0];
      expect(logCallArgs.data.promptName).toBe('test-prompt');
      expect(logCallArgs.data.success).toBe(true);
      expect(logCallArgs.data.model).toBe('mock-model');
    });

    it('inputTokens 基于消息内容长度计算', async () => {
      const shortResult = await service.chat({
        promptName: 'test',
        messages: [{ role: 'user', content: 'hi' }],
      });
      const longResult = await service.chat({
        promptName: 'test',
        messages: [{ role: 'user', content: '这是一段很长的消息内容用于测试 token 计算'.repeat(10) }],
      });
      expect(longResult.inputTokens).toBeGreaterThan(shortResult.inputTokens);
    });
  });

  describe('invalidateCache()', () => {
    it('调用后不报错', () => {
      expect(() => service.invalidateCache()).not.toThrow();
    });
  });

  describe('chatStream() mock 流式', () => {
    it('mock 流式模式分块 yield 内容', async () => {
      const chunks: string[] = [];
      for await (const chunk of service.chatStream({
        messages: [{ role: 'user', content: 'test' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullContent = chunks.join('');
      expect(fullContent).toContain('mock');
      expect(fullContent).toContain('流式');
    });
  });
});

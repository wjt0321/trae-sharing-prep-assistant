import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Query,
  Res,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AiConfigService } from './ai-config.service';
import { AiGatewayService } from '../../infrastructure/ai-gateway/ai-gateway.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { UpdateAiConfigInputDto, TestAiConfigInputDto, ChatStreamInputDto } from './dto/ai-config-input.dto';

/**
 * AI 网关配置接口
 *
 * 所有接口需登录访问，配置由网页端设置，不硬编码。
 * API Key 加密存储，读取时掩码，不主动泄露。
 * 配置变更记录审计日志（不记录 API Key 明文）。
 */
@Controller('ai-config')
@UseGuards(JwtAuthGuard)
export class AiConfigController {
  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly aiGateway: AiGatewayService,
  ) {}

  /** 获取当前配置（API Key 掩码） */
  @Get()
  getConfig() {
    return this.aiConfigService.getConfig();
  }

  /** 更新配置（加密 API Key 后落库） */
  @Put()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateConfig(
    @Body() dto: UpdateAiConfigInputDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.aiConfigService.updateConfig(dto, {
      actorId: user.userId,
      actorEmail: user.email,
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      method: req.method,
      path: req.originalUrl ?? req.url,
    });
  }

  /** 清除配置（回退到 mock 模式） */
  @Delete()
  clearConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.aiConfigService.clearConfig({
      actorId: user.userId,
      actorEmail: user.email,
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      method: req.method,
      path: req.originalUrl ?? req.url,
    });
  }

  /** 测试连通性（不落库） */
  @Post('test')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  testConnection(@Body() dto: TestAiConfigInputDto) {
    return this.aiConfigService.testConnection(dto);
  }

  /**
   * 流式对话（SSE）
   * 直接写入 Response，绕过 ResponseInterceptor。
   * 前端通过 fetch + ReadableStream 读取。
   */
  @Post('chat/stream')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async chatStream(@Body() dto: ChatStreamInputDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const chunk of this.aiGateway.chatStream({ messages: dto.messages })) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    } finally {
      res.end();
    }
  }

  /** 获取 AI 调用统计（成本统计） */
  @Get('stats')
  getStats(@Query('days') days?: string) {
    const daysNum = days ? Math.min(Math.max(parseInt(days, 10) || 30, 1), 90) : 30;
    return this.aiConfigService.getStats(daysNum);
  }
}

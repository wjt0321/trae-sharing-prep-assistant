import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateAiConfigInputDto, TestAiConfigInputDto } from './dto/ai-config-input.dto';

/**
 * AI 网关配置接口
 *
 * 所有接口需登录访问，配置由网页端设置，不硬编码。
 * API Key 加密存储，读取时掩码，不主动泄露。
 */
@Controller('ai-config')
@UseGuards(JwtAuthGuard)
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  /** 获取当前配置（API Key 掩码） */
  @Get()
  getConfig() {
    return this.aiConfigService.getConfig();
  }

  /** 更新配置（加密 API Key 后落库） */
  @Put()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateConfig(@Body() dto: UpdateAiConfigInputDto) {
    return this.aiConfigService.updateConfig(dto);
  }

  /** 清除配置（回退到 mock 模式） */
  @Delete()
  clearConfig() {
    return this.aiConfigService.clearConfig();
  }

  /** 测试连通性（不落库） */
  @Post('test')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  testConnection(@Body() dto: TestAiConfigInputDto) {
    return this.aiConfigService.testConnection(dto);
  }
}

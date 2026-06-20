import { Module } from '@nestjs/common';
import { AiConfigController } from './ai-config.controller';
import { AiConfigService } from './ai-config.service';
import { AuditModule } from '../audit/audit.module';

/**
 * AI 网关配置模块
 *
 * AiGatewayModule 是 @Global，AiGatewayService 已全局可用，无需在此导入。
 */
@Module({
  imports: [AuditModule],
  controllers: [AiConfigController],
  providers: [AiConfigService],
  exports: [AiConfigService],
})
export class AiConfigModule {}

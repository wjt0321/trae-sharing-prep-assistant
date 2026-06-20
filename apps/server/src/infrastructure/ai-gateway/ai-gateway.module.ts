import { Module, Global } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';

/**
 * AI 网关模块
 * 全局可用，统一承接所有 AI 调用
 */
@Global()
@Module({
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}

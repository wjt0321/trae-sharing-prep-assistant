import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * 审计日志模块
 * 参考：12_安全监控指标与发布治理实施清单.md §1
 *
 * AuditService 导出供其他模块（auth/workspace/goal/export 等）调用记录审计日志。
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

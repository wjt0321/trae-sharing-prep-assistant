import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

/**
 * 监控模块
 * 参考：12_安全监控指标与发布治理实施清单.md §4 §5
 *
 * MonitoringService 导出供 RequestLogMiddleware 写入请求统计。
 */
@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}

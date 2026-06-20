import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class MetricsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}

/**
 * 监控指标控制器
 * 参考：12_安全监控指标与发布治理实施清单.md §4 §5
 *
 * 路由：
 * - GET /api/monitoring/health  扩展健康检查（需登录）
 * - GET /api/monitoring/business  业务指标
 * - GET /api/monitoring/system  系统指标
 *
 * 注：基础 /health 端点保持公开（供负载均衡探活），扩展详情需登录。
 */
@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * 扩展健康检查（含 DB / 磁盘 / 任务积压）
   */
  @Get('health')
  getHealth() {
    return this.monitoringService.checkHealth();
  }

  /**
   * 业务指标
   */
  @Get('business')
  getBusinessMetrics(@Query() query: MetricsQueryDto) {
    return this.monitoringService.getBusinessMetrics(query.days ?? 7);
  }

  /**
   * 系统指标
   */
  @Get('system')
  getSystemMetrics(@Query() query: MetricsQueryDto) {
    return this.monitoringService.getSystemMetrics(query.days ?? 7);
  }
}

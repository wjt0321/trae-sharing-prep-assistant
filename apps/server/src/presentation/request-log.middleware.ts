import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../modules/monitoring/monitoring.service';

/**
 * 请求日志中间件
 * 参考：12_安全监控指标与发布治理实施清单.md §4
 *
 * 记录每个请求的 method / path / status / duration，
 * 并将统计写入 MonitoringService（用于系统指标聚合）。
 *
 * 日志格式：`GET /api/goals 200 12ms`
 * 慢请求（>1s）额外 WARN 日志。
 */
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly monitoringService: MonitoringService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    // 健康检查探活不记录（避免日志噪声）
    if (originalUrl === '/health' || originalUrl === '/api/health') {
      next();
      return;
    }

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const statusCode = res.statusCode;

      // 写入监控统计
      this.monitoringService.recordRequest(statusCode, durationMs);

      // 日志输出
      const log = `${method} ${originalUrl} ${statusCode} ${durationMs}ms`;
      if (statusCode >= 500) {
        this.logger.error(log);
      } else if (statusCode >= 400) {
        this.logger.warn(log);
      } else if (durationMs > 1000) {
        this.logger.warn(`[慢请求] ${log}`);
      } else {
        this.logger.log(log);
      }
    });

    next();
  }
}

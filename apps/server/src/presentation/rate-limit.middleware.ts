import {
  Injectable,
  NestMiddleware,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * 速率限制中间件（内存实现，无 Redis 依赖）
 * 参考：12_安全监控指标与发布治理实施清单.md §4
 *
 * 策略：
 * - 全局默认：每 IP 每分钟 120 次
 * - 认证接口（/api/auth/login / /api/auth/register）：每 IP 每分钟 10 次
 * - 内存存储：Map<key, { count, resetAt }>
 * - 定时清理过期条目（每 5 分钟）
 *
 * 注：内存实现仅适用于单实例部署。多实例需替换为 Redis 实现。
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RateLimit');
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly defaultLimit: number;
  private readonly defaultWindowMs: number;
  private readonly authLimit: number;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.defaultLimit = Number(
      this.configService.get('RATE_LIMIT_PER_MINUTE', '120'),
    );
    this.defaultWindowMs = Number(
      this.configService.get('RATE_LIMIT_WINDOW_MS', '60000'),
    );
    this.authLimit = Number(
      this.configService.get('RATE_LIMIT_AUTH_PER_MINUTE', '10'),
    );

    // 定时清理过期条目
    this.cleanupTimer = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
    this.cleanupTimer.unref?.();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = this.getClientIp(req);
    const path = req.originalUrl ?? req.url;
    const method = req.method;

    // 健康检查不限速
    if (path === '/health' || path === '/api/health') {
      next();
      return;
    }

    // OPTIONS 预检不限速
    if (method === 'OPTIONS') {
      next();
      return;
    }

    // 认证接口使用更严格的限速
    const isAuthEndpoint =
      path.includes('/api/auth/login') || path.includes('/api/auth/register');
    const limit = isAuthEndpoint ? this.authLimit : this.defaultLimit;
    const windowMs = this.defaultWindowMs;

    const key = `${ip}:${isAuthEndpoint ? 'auth' : 'global'}`;
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      this.store.set(key, entry);
    }

    entry.count += 1;

    // 设置响应头（便于客户端感知）
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - entry.count));
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(entry.resetAt).toISOString(),
    );

    if (entry.count > limit) {
      this.logger.warn(
        `速率限制触发: ${ip} ${method} ${path} (${entry.count}/${limit})`,
      );
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      throw new HttpException(
        {
          success: false,
          data: null,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: '请求频率超限，请稍后再试',
            details: {
              limit,
              current: entry.count,
              resetAt: new Date(entry.resetAt).toISOString(),
            },
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private getClientIp(req: Request): string {
    // 优先从 X-Forwarded-For 取（反向代理场景）
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
        removed += 1;
      }
    }
    if (removed > 0) {
      this.logger.log(`清理 ${removed} 条过期限速记录`);
    }
  }
}

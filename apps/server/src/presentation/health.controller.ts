import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

/**
 * 健康检查端点
 * 路径：/health（不经过 /api 前缀）
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // 执行简单查询验证数据库连接
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'ai-task-manager-server',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'degraded',
        service: 'ai-task-manager-server',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }
}

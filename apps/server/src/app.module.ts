import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// 基础设施
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { TaskWorkerModule } from './infrastructure/task-worker/task-worker.module';
import { AiGatewayModule } from './infrastructure/ai-gateway/ai-gateway.module';
import { StorageModule } from './infrastructure/storage/storage.module';

// 表现层
import { HealthController } from './presentation/health.controller';
import { GlobalExceptionFilter } from './presentation/global-exception.filter';
import { ResponseInterceptor } from './presentation/response.interceptor';
import { RequestLogMiddleware } from './presentation/request-log.middleware';
import { RateLimitMiddleware } from './presentation/rate-limit.middleware';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { GoalModule } from './modules/goal/goal.module';
import { PlanningModule } from './modules/planning/planning.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { ExportModule } from './modules/export/export.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AiConfigModule } from './modules/ai-config/ai-config.module';
import { PromptRegistryModule } from './modules/prompt-registry/prompt-registry.module';
import { AuditModule } from './modules/audit/audit.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';

@Module({
  imports: [
    // 全局配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    // 基础设施（全局）
    PrismaModule,
    TaskWorkerModule,
    AiGatewayModule,
    StorageModule,
    // 业务模块
    AuthModule,
    WorkspaceModule,
    GoalModule,
    PlanningModule,
    ExecutionModule,
    KnowledgeModule,
    CollaborationModule,
    ExportModule,
    IntegrationModule,
    NotificationModule,
    AiConfigModule,
    PromptRegistryModule,
    // 安全监控与发布治理（12）
    AuditModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * 全局中间件注册
   *
   * 顺序：速率限制 → 请求日志 → 路由处理
   * - RateLimitMiddleware 必须最先执行（拒绝超限请求）
   * - RequestLogMiddleware 记录所有请求（含被拒绝的）
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RateLimitMiddleware, RequestLogMiddleware)
      .forRoutes('*');
  }
}

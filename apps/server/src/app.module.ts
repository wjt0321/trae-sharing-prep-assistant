import { Module } from '@nestjs/common';
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
export class AppModule {}

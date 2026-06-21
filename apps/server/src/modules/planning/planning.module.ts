import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanEngine } from './plan-engine';
import { AuthModule } from '../auth/auth.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { NotificationModule } from '../notification/notification.module';
import { PromptRegistryModule } from '../prompt-registry/prompt-registry.module';
import { GoalModule } from '../goal/goal.module';

@Module({
  imports: [
    AuthModule,
    CollaborationModule,
    NotificationModule,
    PromptRegistryModule,
    GoalModule,
  ],
  controllers: [PlanningController],
  providers: [PlanningService, PlanEngine],
  exports: [PlanningService],
})
export class PlanningModule {}

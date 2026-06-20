import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanEngine } from './plan-engine';
import { AuthModule } from '../auth/auth.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AuthModule, CollaborationModule, NotificationModule],
  controllers: [PlanningController],
  providers: [PlanningService, PlanEngine],
  exports: [PlanningService],
})
export class PlanningModule {}

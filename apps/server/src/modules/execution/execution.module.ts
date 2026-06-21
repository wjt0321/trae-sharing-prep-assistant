import { Module } from '@nestjs/common';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { NotificationModule } from '../notification/notification.module';
import { GoalModule } from '../goal/goal.module';

@Module({
  imports: [CollaborationModule, NotificationModule, GoalModule],
  controllers: [ExecutionController],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}

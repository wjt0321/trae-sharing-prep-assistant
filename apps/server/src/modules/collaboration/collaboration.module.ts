import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { NotificationModule } from '../notification/notification.module';
import { GoalModule } from '../goal/goal.module';

@Module({
  imports: [NotificationModule, GoalModule],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}

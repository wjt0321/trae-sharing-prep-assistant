import { Module } from '@nestjs/common';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [CollaborationModule, NotificationModule],
  controllers: [ExecutionController],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}

import { Module } from '@nestjs/common';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { GoalPermissionService } from './goal-permission.service';
import { AuthModule } from '../auth/auth.module';
import { PromptRegistryModule } from '../prompt-registry/prompt-registry.module';

@Module({
  imports: [AuthModule, PromptRegistryModule],
  controllers: [GoalController],
  providers: [GoalService, GoalPermissionService],
  exports: [GoalService, GoalPermissionService],
})
export class GoalModule {}

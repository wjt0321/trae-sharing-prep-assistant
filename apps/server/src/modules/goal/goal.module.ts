import { Module } from '@nestjs/common';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { AuthModule } from '../auth/auth.module';
import { PromptRegistryModule } from '../prompt-registry/prompt-registry.module';

@Module({
  imports: [AuthModule, PromptRegistryModule],
  controllers: [GoalController],
  providers: [GoalService],
  exports: [GoalService],
})
export class GoalModule {}

import { Module } from '@nestjs/common';
import { PromptRegistryController } from './prompt-registry.controller';
import { PromptRegistryService } from './prompt-registry.service';

/**
 * 提示词模板模块（Prompt Registry）
 *
 * PrismaModule 是全局模块，无需在此导入。
 */
@Module({
  controllers: [PromptRegistryController],
  providers: [PromptRegistryService],
  exports: [PromptRegistryService],
})
export class PromptRegistryModule {}

import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength, MinLength, IsObject } from 'class-validator';
import type {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
  RenderPromptDto,
} from '@ai-task-manager/shared';

/** 创建提示词模板（输入验证） */
export class CreatePromptTemplateInputDto implements CreatePromptTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  systemPrompt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  userTemplate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

/** 更新提示词模板（创建新版本） */
export class UpdatePromptTemplateInputDto implements UpdatePromptTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  userTemplate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

/** 渲染预览 */
export class RenderPromptInputDto implements RenderPromptDto {
  @IsObject()
  variables: Record<string, string>;
}

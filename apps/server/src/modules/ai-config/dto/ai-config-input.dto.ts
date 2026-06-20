import { IsString, IsNotEmpty, MinLength, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { UpdateAiProviderConfigDto, TestAiConfigDto } from '@ai-task-manager/shared';

/** 更新 AI 网关配置（输入验证） */
export class UpdateAiConfigInputDto implements UpdateAiProviderConfigDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  baseUrl: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(256)
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  modelName: string;
}

/** 测试 AI 网关连通性（输入验证） */
export class TestAiConfigInputDto implements TestAiConfigDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  baseUrl: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(256)
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  modelName: string;
}

/** 单条消息（流式对话用） */
export class ChatMessageInputDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  content: string;
}

/** 流式对话（输入验证） */
export class ChatStreamInputDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageInputDto)
  messages: ChatMessageInputDto[];
}

import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import {
  TemplateCategoryEnum,
  ScenarioTypeEnum,
  KnowledgeAssetTypeEnum,
  type TemplateContentDto,
} from '@ai-task-manager/shared';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TemplateCategoryEnum)
  category: TemplateCategoryEnum;

  @IsOptional()
  @IsEnum(ScenarioTypeEnum)
  scenarioType?: ScenarioTypeEnum;

  @IsObject()
  content: TemplateContentDto;

  @IsOptional()
  @IsBoolean()
  isBuiltIn?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TemplateCategoryEnum)
  category?: TemplateCategoryEnum;

  @IsOptional()
  @IsEnum(ScenarioTypeEnum)
  scenarioType?: ScenarioTypeEnum;

  @IsOptional()
  @IsObject()
  content?: TemplateContentDto;
}

export class CreateTemplateFromGoalDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TemplateCategoryEnum)
  category?: TemplateCategoryEnum;
}

export class CreateAssetDto {
  @IsString()
  title: string;

  @IsEnum(KnowledgeAssetTypeEnum)
  type: KnowledgeAssetTypeEnum;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  sourceGoalId?: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(KnowledgeAssetTypeEnum)
  type?: KnowledgeAssetTypeEnum;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}

export class CreateAssetFromExportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(KnowledgeAssetTypeEnum)
  type?: KnowledgeAssetTypeEnum;

  @IsOptional()
  @IsString()
  tags?: string;
}

export class TemplateListQueryDto {
  @IsOptional()
  @IsEnum(TemplateCategoryEnum)
  category?: TemplateCategoryEnum;

  @IsOptional()
  @IsEnum(ScenarioTypeEnum)
  scenarioType?: ScenarioTypeEnum;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsBoolean()
  builtInOnly?: boolean;
}

export class AssetListQueryDto {
  @IsOptional()
  @IsEnum(KnowledgeAssetTypeEnum)
  type?: KnowledgeAssetTypeEnum;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}

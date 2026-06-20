import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GoalTypeEnum, ScenarioTypeEnum, GoalPriorityEnum } from '@ai-task-manager/shared';

class NormalizeFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsDateString()
  shareDate?: string;

  @IsOptional()
  @IsEnum(GoalTypeEnum)
  goalType?: GoalTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  preparedness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeConstraint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  resourceConstraint?: string;

  @IsOptional()
  @IsEnum(GoalPriorityEnum)
  priority?: GoalPriorityEnum;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  successCriteria?: string;

  @IsOptional()
  @IsBoolean()
  isCollaborative?: boolean;
}

export class NormalizeContextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  topic: string;

  @IsEnum(ScenarioTypeEnum)
  scenarioType: ScenarioTypeEnum;

  @ValidateNested()
  @Type(() => NormalizeFieldsDto)
  fields: NormalizeFieldsDto;
}

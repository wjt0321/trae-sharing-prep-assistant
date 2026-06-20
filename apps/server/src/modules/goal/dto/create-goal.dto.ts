import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import {
  GoalTypeEnum,
  ScenarioTypeEnum,
  GoalPriorityEnum,
  GoalStageEnum,
} from '@ai-task-manager/shared';

export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  topic: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsEnum(ScenarioTypeEnum)
  scenarioType?: ScenarioTypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(600)
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
  @IsEnum(GoalStageEnum)
  currentStage?: GoalStageEnum;

  @IsOptional()
  @IsBoolean()
  isCollaborative?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sceneTags?: string;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskStatusEnum } from '@ai-task-manager/shared';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatusEnum)
  status: TaskStatusEnum;

  @IsOptional()
  @IsString()
  blockerNote?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

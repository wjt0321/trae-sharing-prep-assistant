import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatusEnum } from '@ai-task-manager/shared';

class BatchUpdateItem {
  @IsString()
  taskId: string;

  @IsEnum(TaskStatusEnum)
  status: TaskStatusEnum;

  @IsOptional()
  @IsString()
  blockerNote?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BatchUpdateStatusDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateItem)
  updates: BatchUpdateItem[];
}

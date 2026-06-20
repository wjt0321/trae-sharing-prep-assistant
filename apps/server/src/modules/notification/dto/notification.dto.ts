import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { NotificationTypeEnum } from '@ai-task-manager/shared';

export class NotificationListQueryDto {
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @IsEnum(NotificationTypeEnum)
  type?: NotificationTypeEnum;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

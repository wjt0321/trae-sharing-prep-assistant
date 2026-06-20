import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import {
  CommentAnchorTypeEnum,
  CommentTypeEnum,
  ActivityEventTypeEnum,
} from '@ai-task-manager/shared';

// ============================================================
// 评论 DTO
// ============================================================

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsEnum(CommentAnchorTypeEnum)
  anchorType?: CommentAnchorTypeEnum;

  @IsOptional()
  @IsString()
  anchorId?: string;

  @IsOptional()
  @IsEnum(CommentTypeEnum)
  type?: CommentTypeEnum;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class UpdateCommentDto {
  @IsString()
  content: string;
}

export class CommentListQueryDto {
  @IsOptional()
  @IsEnum(CommentAnchorTypeEnum)
  anchorType?: CommentAnchorTypeEnum;

  @IsOptional()
  @IsString()
  anchorId?: string;

  @IsOptional()
  @IsEnum(CommentTypeEnum)
  type?: CommentTypeEnum;

  @IsOptional()
  @IsString()
  unresolvedOnly?: string; // 'true' / 'false'
}

// ============================================================
// 任务指派 DTO
// ============================================================

export class AssignTaskDto {
  @IsString()
  assigneeId: string;

  @IsOptional()
  @IsString()
  note?: string;
}

// ============================================================
// 活动流查询 DTO
// ============================================================

export class ActivityListQueryDto {
  @IsOptional()
  @IsEnum(ActivityEventTypeEnum)
  type?: ActivityEventTypeEnum;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

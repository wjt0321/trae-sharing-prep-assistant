import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import {
  CommentAnchorTypeEnum,
  CommentTypeEnum,
  ActivityEventTypeEnum,
} from '@ai-task-manager/shared';
import { CreateCommentDto } from './dto/collaboration.dto';
import { UpdateCommentDto } from './dto/collaboration.dto';
import { AssignTaskDto } from './dto/collaboration.dto';
import { ActivityListQueryDto } from './dto/collaboration.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // ============================================================
  // 评论 CRUD
  // ============================================================

  @Get('goals/:goalId/comments')
  findAllComments(
    @Param('goalId') goalId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('anchorType') anchorType?: CommentAnchorTypeEnum,
    @Query('anchorId') anchorId?: string,
    @Query('type') type?: CommentTypeEnum,
    @Query('unresolvedOnly') unresolvedOnly?: string,
  ) {
    return this.collaborationService.findAllComments(goalId, user.userId, {
      anchorType,
      anchorId,
      type,
      unresolvedOnly: unresolvedOnly === 'true',
    });
  }

  @Post('goals/:goalId/comments')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createComment(
    @Param('goalId') goalId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.createComment(goalId, dto, user.userId);
  }

  @Patch('comments/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateComment(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.updateComment(id, dto, user.userId);
  }

  @Delete('comments/:id')
  removeComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.removeComment(id, user.userId);
  }

  @Post('comments/:id/resolve')
  resolveComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.resolveComment(id, user.userId);
  }

  @Post('comments/:id/reopen')
  reopenComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.reopenComment(id, user.userId);
  }

  // ============================================================
  // 任务指派
  // ============================================================

  @Post('tasks/:taskId/assign')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  assignTask(
    @Param('taskId') taskId: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.assignTask(taskId, dto, user.userId);
  }

  @Delete('tasks/:taskId/assign')
  unassignTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.unassignTask(taskId, user.userId);
  }

  @Get('tasks/:taskId/assignments')
  getAssignmentHistory(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.getAssignmentHistory(taskId, user.userId);
  }

  @Get('workspaces/:workspaceId/my-assignments')
  findMyAssignments(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collaborationService.findMyAssignments(workspaceId, user.userId);
  }

  // ============================================================
  // 活动流
  // ============================================================

  @Get('goals/:goalId/activities')
  findActivities(
    @Param('goalId') goalId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ActivityListQueryDto,
  ) {
    return this.collaborationService.findActivities(goalId, user.userId, query);
  }
}

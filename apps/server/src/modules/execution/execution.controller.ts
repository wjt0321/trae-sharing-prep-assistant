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
import { ExecutionService } from './execution.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-status.dto';
import { SyncTasksDto } from './dto/sync-tasks.dto';
import { BatchUpdateStatusDto } from './dto/batch-update.dto';
import { TaskStatusEnum } from '@ai-task-manager/shared';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  // ============================================================
  // 任务列表与详情
  // ============================================================

  @Get('goals/:goalId/tasks')
  findAll(
    @Param('goalId') goalId: string,
    @Query('stageId') stageId?: string,
    @Query('status') status?: TaskStatusEnum,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.executionService.findAll(goalId, user!.userId, { stageId, status });
  }

  @Get('goals/:goalId/tasks/progress')
  getProgress(
    @Param('goalId') goalId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.executionService.getProgress(goalId, user.userId);
  }

  @Get('goals/:goalId/tasks/next-steps')
  getNextSteps(
    @Param('goalId') goalId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.executionService.getNextSteps(goalId, user.userId);
  }

  @Get('tasks/:id/history')
  getStatusHistory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.executionService.getStatusHistory(id, user.userId);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.executionService.findOne(id, user.userId);
  }

  // ============================================================
  // 任务 CRUD
  // ============================================================

  @Post('goals/:goalId/tasks')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(
    @Param('goalId') goalId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.executionService.create(goalId, dto, user.userId);
  }

  @Patch('tasks/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.executionService.update(id, dto, user.userId);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.executionService.remove(id, user.userId);
  }

  // ============================================================
  // 任务状态推进
  // ============================================================

  @Patch('tasks/:id/status')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.executionService.updateStatus(id, dto, user.userId);
  }

  @Post('goals/:goalId/tasks/batch-status')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  batchUpdateStatus(
    @Param('goalId') goalId: string,
    @Body() dto: BatchUpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.executionService.batchUpdateStatus(goalId, dto, user.userId);
  }

  // ============================================================
  // 从规划同步任务
  // ============================================================

  @Post('goals/:goalId/tasks/sync-from-plan')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  syncFromPlan(
    @Param('goalId') goalId: string,
    @Body() dto: SyncTasksDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.executionService.syncFromPlan(goalId, dto, user.userId);
  }
}

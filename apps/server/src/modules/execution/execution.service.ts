import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { NotificationService } from '../notification/notification.service';
import {
  ApiError,
  ErrorCode,
  TaskStatusEnum,
  TASK_STATUS_TRANSITIONS,
  TASK_TERMINAL_STATUSES,
  GoalStageEnum,
  ActivityEventTypeEnum,
  type TaskResponseDto,
  type TaskStatusHistoryDto,
  type GoalProgressDto,
  type PhaseProgressDto,
  type NextStepsResponseDto,
  type NextStepSuggestionDto,
  type SyncTasksResponseDto,
  type BatchUpdateResultDto,
  type PlanContent,
  type PlanPhase,
} from '@ai-task-manager/shared';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';
import type { UpdateTaskStatusDto } from './dto/update-status.dto';
import type { SyncTasksDto } from './dto/sync-tasks.dto';
import type { BatchUpdateStatusDto } from './dto/batch-update.dto';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationService: CollaborationService,
    private readonly notificationService: NotificationService,
  ) {}

  // ============================================================
  // 任务查询
  // ============================================================

  async findAll(
    goalId: string,
    userId: string,
    query?: { stageId?: string; status?: TaskStatusEnum },
  ): Promise<TaskResponseDto[]> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);
    const where: Record<string, unknown> = { goalId: goal.id };
    if (query?.stageId) where.stageId = query.stageId;
    if (query?.status) where.status = query.status;

    const tasks = await this.prisma.executionTask.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return tasks.map((t) => this.toTaskResponse(t));
  }

  async findOne(id: string, userId: string): Promise<TaskResponseDto> {
    const task = await this.prisma.executionTask.findUnique({ where: { id } });
    if (!task) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_NOT_FOUND);
    }
    await this.getGoalWithMembershipCheck(task.goalId, userId);
    return this.toTaskResponse(task);
  }

  async getStatusHistory(taskId: string, userId: string): Promise<TaskStatusHistoryDto[]> {
    const task = await this.prisma.executionTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_NOT_FOUND);
    }
    await this.getGoalWithMembershipCheck(task.goalId, userId);

    const history = await this.prisma.taskStatusHistory.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
    return history.map((h) => ({
      id: h.id,
      taskId: h.taskId,
      fromStatus: h.fromStatus as TaskStatusEnum | null,
      toStatus: h.toStatus as TaskStatusEnum,
      note: h.note,
      blockerNote: h.blockerNote,
      operatorId: h.operatorId,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  // ============================================================
  // 任务 CRUD
  // ============================================================

  async create(goalId: string, dto: CreateTaskDto, userId: string): Promise<TaskResponseDto> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);

    const task = await this.prisma.executionTask.create({
      data: {
        goalId: goal.id,
        stageId: dto.stageId ?? null,
        stageName: dto.stageName ?? null,
        title: dto.title,
        description: dto.description ?? null,
        status: TaskStatusEnum.PENDING,
        sortOrder: dto.sortOrder ?? 0,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        creatorId: userId,
      },
    });

    // 记录初始状态历史
    await this.prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: null,
        toStatus: TaskStatusEnum.PENDING,
        operatorId: userId,
      },
    });

    // 若目标还在规划阶段，创建任务后推进到执行阶段
    if (goal.currentStage === GoalStageEnum.PLANNING) {
      await this.prisma.goal.update({
        where: { id: goal.id },
        data: { currentStage: GoalStageEnum.EXECUTING },
      });
    }

    // 记录活动流
    await this.collaborationService.recordActivity({
      goalId: goal.id,
      actorId: userId,
      type: ActivityEventTypeEnum.TASK_CREATED,
      targetType: 'task',
      targetId: task.id,
      targetTitle: task.title,
    });

    this.logger.log(`任务已创建: ${task.id} (goal=${goal.id})`);
    return this.toTaskResponse(task);
  }

  async update(id: string, dto: UpdateTaskDto, userId: string): Promise<TaskResponseDto> {
    const task = await this.prisma.executionTask.findUnique({ where: { id } });
    if (!task) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_NOT_FOUND);
    }
    await this.getGoalWithMembershipCheck(task.goalId, userId);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.stageId !== undefined) data.stageId = dto.stageId;
    if (dto.stageName !== undefined) data.stageName = dto.stageName;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const updated = await this.prisma.executionTask.update({ where: { id }, data });
    return this.toTaskResponse(updated);
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const task = await this.prisma.executionTask.findUnique({ where: { id } });
    if (!task) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_NOT_FOUND);
    }
    await this.getGoalWithMembershipCheck(task.goalId, userId);

    await this.prisma.executionTask.delete({ where: { id } });
    return { success: true };
  }

  // ============================================================
  // 任务状态推进
  // ============================================================

  async updateStatus(
    id: string,
    dto: UpdateTaskStatusDto,
    userId: string,
  ): Promise<TaskResponseDto> {
    const task = await this.prisma.executionTask.findUnique({ where: { id } });
    if (!task) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_NOT_FOUND);
    }
    await this.getGoalWithMembershipCheck(task.goalId, userId);

    const fromStatus = task.status as TaskStatusEnum;
    const toStatus = dto.status;

    // 终态校验
    if (TASK_TERMINAL_STATUSES.includes(fromStatus)) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_ALREADY_COMPLETED, {
        message: `任务处于终态（${fromStatus}），不可再变更`,
      });
    }

    // 状态机校验
    const allowed = TASK_STATUS_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new ApiError(ErrorCode.BAD_REQUEST, {
        message: `不允许从 ${fromStatus} 流转到 ${toStatus}`,
      });
    }

    // blocked 必须填写阻塞原因
    if (toStatus === TaskStatusEnum.BLOCKED && !dto.blockerNote?.trim()) {
      throw new ApiError(ErrorCode.VALIDATION_FAILED, {
        message: '标记为受阻时必须填写阻塞原因',
      });
    }

    const updateData: Record<string, unknown> = { status: toStatus };
    if (toStatus === TaskStatusEnum.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (fromStatus === TaskStatusEnum.COMPLETED) {
      // 从已完成回退，清除完成时间
      updateData.completedAt = null;
    }
    if (toStatus === TaskStatusEnum.BLOCKED) {
      updateData.blockerNote = dto.blockerNote;
    } else {
      // 离开受阻状态时清空阻塞原因
      updateData.blockerNote = null;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.executionTask.update({ where: { id }, data: updateData }),
      this.prisma.taskStatusHistory.create({
        data: {
          taskId: id,
          fromStatus,
          toStatus,
          note: dto.note ?? null,
          blockerNote: toStatus === TaskStatusEnum.BLOCKED ? dto.blockerNote ?? null : null,
          operatorId: userId,
        },
      }),
    ]);

    // 记录活动流
    await this.collaborationService.recordActivity({
      goalId: task.goalId,
      actorId: userId,
      type: ActivityEventTypeEnum.TASK_STATUS_CHANGED,
      targetType: 'task',
      targetId: id,
      targetTitle: task.title,
      detail: `${fromStatus} → ${toStatus}`,
    });

    // 通知任务指派人（排除操作者自己）
    if (task.assigneeId && task.assigneeId !== userId) {
      const operator = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });
      const goal = await this.prisma.goal.findUnique({
        where: { id: task.goalId },
        select: { workspaceId: true },
      });
      if (goal) {
        await this.notificationService.notifyTaskStatusChanged({
          assigneeId: task.assigneeId,
          workspaceId: goal.workspaceId,
          taskTitle: task.title,
          taskId: id,
          fromStatus,
          toStatus,
          operatorName: operator?.displayName ?? '未知用户',
          goalId: task.goalId,
        });
      }
    }

    this.logger.log(`任务状态变更: ${id} ${fromStatus} → ${toStatus} (by ${userId})`);
    return this.toTaskResponse(updated);
  }

  async batchUpdateStatus(
    goalId: string,
    dto: BatchUpdateStatusDto,
    userId: string,
  ): Promise<BatchUpdateResultDto> {
    await this.getGoalWithMembershipCheck(goalId, userId);

    let succeeded = 0;
    const failures: Array<{ taskId: string; reason: string }> = [];

    for (const item of dto.updates) {
      try {
        await this.updateStatus(item.taskId, {
          status: item.status,
          blockerNote: item.blockerNote,
          note: item.note,
        }, userId);
        succeeded++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ taskId: item.taskId, reason });
      }
    }

    return { succeeded, failed: failures.length, failures };
  }

  // ============================================================
  // 从规划同步任务
  // ============================================================

  async syncFromPlan(
    goalId: string,
    dto: SyncTasksDto,
    userId: string,
  ): Promise<SyncTasksResponseDto> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);

    // 读取活跃规划
    const activePlan = await this.prisma.plan.findFirst({
      where: { goalId: goal.id, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (!activePlan) {
      throw new ApiError(ErrorCode.PLAN_NOT_FOUND, {
        message: '尚无活跃规划，请先生成规划再同步任务',
      });
    }

    const content = JSON.parse(activePlan.content) as PlanContent;
    const mode = dto.replace ? 'replace' : 'append';

    let removed = 0;
    if (dto.replace) {
      const existing = await this.prisma.executionTask.findMany({
        where: { goalId: goal.id },
        select: { id: true },
      });
      removed = existing.length;
      await this.prisma.executionTask.deleteMany({ where: { goalId: goal.id } });
    }

    // 收集规划中的所有任务
    const planTasks = this.collectPlanTasks(content.phases);

    // append 模式：跳过已存在的（按 title + stageId 去重）
    let skipped = 0;
    const existingKeys = new Set<string>();
    if (!dto.replace) {
      const existing = await this.prisma.executionTask.findMany({
        where: { goalId: goal.id },
        select: { title: true, stageId: true },
      });
      for (const t of existing) {
        existingKeys.add(`${t.title}|${t.stageId ?? ''}`);
      }
    }

    const toCreate: Array<{
      goalId: string;
      stageId: string;
      stageName: string;
      title: string;
      description: string;
      status: string;
      sortOrder: number;
      creatorId: string;
    }> = [];

    for (const pt of planTasks) {
      const key = `${pt.title}|${pt.stageId ?? ''}`;
      if (!dto.replace && existingKeys.has(key)) {
        skipped++;
        continue;
      }
      toCreate.push({
        goalId: goal.id,
        stageId: pt.stageId,
        stageName: pt.stageName,
        title: pt.title,
        description: pt.description,
        status: TaskStatusEnum.PENDING,
        sortOrder: pt.sortOrder,
        creatorId: userId,
      });
    }

    // 批量创建任务 + 初始状态历史
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.executionTask.createMany({ data: toCreate });
      // 记录初始状态历史
      const historyData = toCreate.map(() => ({
        // createMany 不返回 id，这里用占位，下面单独处理
        placeholder: true,
      }));
      // 由于 createMany 不返回记录，单独查询刚创建的任务补历史
      if (created.count > 0) {
        const fresh = await tx.executionTask.findMany({
          where: { goalId: goal.id, status: TaskStatusEnum.PENDING },
          orderBy: { createdAt: 'desc' },
          take: created.count,
          select: { id: true },
        });
        if (fresh.length > 0) {
          await tx.taskStatusHistory.createMany({
            data: fresh.map((f) => ({
              taskId: f.id,
              fromStatus: null,
              toStatus: TaskStatusEnum.PENDING,
              operatorId: userId,
            })),
          });
        }
      }
      void historyData;
    });

    // 推进目标到执行阶段
    if (goal.currentStage === GoalStageEnum.PLANNING) {
      await this.prisma.goal.update({
        where: { id: goal.id },
        data: { currentStage: GoalStageEnum.EXECUTING },
      });
    }

    const total = await this.prisma.executionTask.count({ where: { goalId: goal.id } });

    this.logger.log(
      `任务同步完成: goal=${goal.id}, mode=${mode}, created=${toCreate.length}, skipped=${skipped}, removed=${removed}`,
    );

    return {
      mode,
      created: toCreate.length,
      skipped,
      removed,
      total,
    };
  }

  // ============================================================
  // 进度统计
  // ============================================================

  async getProgress(goalId: string, userId: string): Promise<GoalProgressDto> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);

    const tasks = await this.prisma.executionTask.findMany({
      where: { goalId: goal.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === TaskStatusEnum.COMPLETED).length;
    const inProgressTasks = tasks.filter((t) => t.status === TaskStatusEnum.IN_PROGRESS).length;
    const blockedTasks = tasks.filter((t) => t.status === TaskStatusEnum.BLOCKED).length;
    const pendingTasks = tasks.filter((t) => t.status === TaskStatusEnum.PENDING).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 阶段维度进度
    const phaseMap = new Map<string, { stageId: string; stageName: string; tasks: typeof tasks }>();
    for (const t of tasks) {
      const key = t.stageId ?? '__no_stage__';
      if (!phaseMap.has(key)) {
        phaseMap.set(key, {
          stageId: t.stageId ?? '',
          stageName: t.stageName ?? '未分组',
          tasks: [],
        });
      }
      phaseMap.get(key)!.tasks.push(t);
    }

    const phases: PhaseProgressDto[] = Array.from(phaseMap.values()).map((p) => {
      const total = p.tasks.length;
      const completed = p.tasks.filter((t) => t.status === TaskStatusEnum.COMPLETED).length;
      const inProgress = p.tasks.filter((t) => t.status === TaskStatusEnum.IN_PROGRESS).length;
      const blocked = p.tasks.filter((t) => t.status === TaskStatusEnum.BLOCKED).length;
      const pending = p.tasks.filter((t) => t.status === TaskStatusEnum.PENDING).length;
      return {
        stageId: p.stageId,
        stageName: p.stageName,
        total,
        completed,
        inProgress,
        blocked,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    return {
      goalId: goal.id,
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      pendingTasks,
      completionRate,
      phases,
      hasBlocker: blockedTasks > 0,
      hasSyncedTasks: totalTasks > 0,
    };
  }

  // ============================================================
  // 下一步建议
  // ============================================================

  async getNextSteps(goalId: string, userId: string): Promise<NextStepsResponseDto> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);

    const tasks = await this.prisma.executionTask.findMany({
      where: { goalId: goal.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // 读取活跃规划的 nextActions 与 milestones
    const activePlan = await this.prisma.plan.findFirst({
      where: { goalId: goal.id, isActive: true },
      orderBy: { version: 'desc' },
    });
    const planContent = activePlan ? (JSON.parse(activePlan.content) as PlanContent) : null;

    // 今日行动：进行中的任务 + 待推进任务（取前 5 个）
    const inProgress = tasks.filter((t) => t.status === TaskStatusEnum.IN_PROGRESS);
    const pending = tasks.filter((t) => t.status === TaskStatusEnum.PENDING);
    const todayActions = [...inProgress, ...pending].slice(0, 5).map((t) => this.toTaskResponse(t));

    // 生成建议
    const suggestions: NextStepSuggestionDto[] = [];
    const blockedTasks = tasks.filter((t) => t.status === TaskStatusEnum.BLOCKED);
    let recommendReplan = false;
    let replanReason: string | undefined;

    // 1. 受阻任务建议
    for (const t of blockedTasks) {
      suggestions.push({
        type: 'action',
        priority: 'high',
        content: `任务「${t.title}」受阻：${t.blockerNote ?? '未填写原因'}，建议尽快处理或调整方案`,
        taskId: t.id,
      });
    }

    // 2. 进行中任务建议
    for (const t of inProgress.slice(0, 3)) {
      suggestions.push({
        type: 'action',
        priority: 'medium',
        content: `继续推进「${t.title}」`,
        taskId: t.id,
      });
    }

    // 3. 待办任务建议（取第一个）
    if (pending.length > 0 && inProgress.length === 0) {
      const next = pending[0];
      suggestions.push({
        type: 'action',
        priority: 'high',
        content: `建议开始「${next.title}」`,
        taskId: next.id,
      });
    }

    // 4. 规划中的下一步动作
    if (planContent) {
      for (const action of planContent.nextActions.slice(0, 3)) {
        suggestions.push({
          type: 'action',
          priority: 'low',
          content: action,
        });
      }
    }

    // 5. 风险提醒：受阻任务超过 2 个 或 受阻持续，建议重规划
    if (blockedTasks.length >= 2) {
      recommendReplan = true;
      replanReason = `当前有 ${blockedTasks.length} 个任务受阻，建议重新规划路径`;
      suggestions.push({
        type: 'replan',
        priority: 'high',
        content: replanReason,
      });
    }

    // 6. 时间风险：检查 dueDate 临近的待办
    const now = new Date();
    for (const t of [...inProgress, ...pending]) {
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (diffHours < 24 && diffHours > 0) {
          suggestions.push({
            type: 'risk',
            priority: 'high',
            content: `任务「${t.title}」截止时间临近（${due.toLocaleDateString('zh-CN')}），注意进度`,
            taskId: t.id,
          });
        } else if (diffHours <= 0) {
          suggestions.push({
            type: 'risk',
            priority: 'high',
            content: `任务「${t.title}」已逾期，建议调整时间或重规划`,
            taskId: t.id,
          });
        }
      }
    }

    // 7. 全部完成的庆祝建议
    if (tasks.length > 0 && tasks.every((t) => t.status === TaskStatusEnum.COMPLETED)) {
      suggestions.push({
        type: 'action',
        priority: 'low',
        content: '所有任务已完成，建议归档目标或复盘总结',
      });
    }

    return {
      goalId: goal.id,
      todayActions,
      suggestions,
      recommendReplan,
      replanReason,
    };
  }

  // ============================================================
  // 私有辅助
  // ============================================================

  private async getGoalWithMembershipCheck(goalId: string, userId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, deletedAt: null },
    });
    if (!goal) {
      throw new ApiError(ErrorCode.GOAL_NOT_FOUND);
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: goal.workspaceId, userId } },
    });
    if (!member) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: '你不是该目标所属工作区的成员',
      });
    }

    return goal;
  }

  /** 从规划阶段中收集任务，扁平化为同步用结构 */
  private collectPlanTasks(
    phases: PlanPhase[],
  ): Array<{
    stageId: string;
    stageName: string;
    title: string;
    description: string;
    sortOrder: number;
  }> {
    const result: Array<{
      stageId: string;
      stageName: string;
      title: string;
      description: string;
      sortOrder: number;
    }> = [];

    for (const phase of phases) {
      phase.tasks.forEach((task, idx) => {
        result.push({
          stageId: phase.id,
          stageName: phase.name,
          title: task.title,
          description: task.description,
          sortOrder: phase.order * 100 + idx,
        });
      });
    }
    return result;
  }

  private toTaskResponse(task: {
    id: string;
    goalId: string;
    stageId: string | null;
    stageName: string | null;
    title: string;
    description: string | null;
    status: string;
    sortOrder: number;
    dueDate: Date | null;
    completedAt: Date | null;
    blockerNote: string | null;
    assigneeId: string | null;
    creatorId: string;
    createdAt: Date;
    updatedAt: Date;
  }): TaskResponseDto {
    return {
      id: task.id,
      goalId: task.goalId,
      stageId: task.stageId,
      stageName: task.stageName,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatusEnum,
      sortOrder: task.sortOrder,
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      blockerNote: task.blockerNote,
      assigneeId: task.assigneeId,
      creatorId: task.creatorId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}

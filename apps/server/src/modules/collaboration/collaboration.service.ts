import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  ApiError,
  ErrorCode,
  CommentAnchorTypeEnum,
  CommentTypeEnum,
  ActivityEventTypeEnum,
  ACTIVITY_EVENT_TYPE_LABELS,
  type CommentResponseDto,
  type CommentAuthorDto,
  type AssignmentResponseDto,
  type AssignmentHistoryDto,
  type ActivityEventDto,
  type ActivityListQueryDto,
} from '@ai-task-manager/shared';
import type { CreateCommentDto } from './dto/collaboration.dto';
import type { UpdateCommentDto } from './dto/collaboration.dto';
import type { AssignTaskDto } from './dto/collaboration.dto';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ============================================================
  // 评论 CRUD
  // ============================================================

  async findAllComments(
    goalId: string,
    userId: string,
    query?: {
      anchorType?: CommentAnchorTypeEnum;
      anchorId?: string;
      type?: CommentTypeEnum;
      unresolvedOnly?: boolean;
    },
  ): Promise<CommentResponseDto[]> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);

    const where: Record<string, unknown> = { goalId: goal.id };
    if (query?.anchorType) where.anchorType = query.anchorType;
    if (query?.anchorId) where.anchorId = query.anchorId;
    if (query?.type) where.type = query.type;
    if (query?.unresolvedOnly) where.resolvedAt = null;

    // 只查顶层评论，回复在应用层组装
    const comments = await this.prisma.comment.findMany({
      where: { ...where, parentId: null },
      orderBy: { createdAt: 'asc' },
    });

    // 查询所有回复
    const topIds = comments.map((c) => c.id);
    const replies = topIds.length > 0
      ? await this.prisma.comment.findMany({
          where: { parentId: { in: topIds } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // 收集所有用户 ID
    const userIds = new Set<string>();
    for (const c of [...comments, ...replies]) {
      userIds.add(c.userId);
    }
    const userMap = await this.getUserMap(Array.from(userIds));

    // 组装回复树
    const replyMap = new Map<string, typeof replies>();
    for (const r of replies) {
      const arr = replyMap.get(r.parentId!) ?? [];
      arr.push(r);
      replyMap.set(r.parentId!, arr);
    }

    return comments.map((c) =>
      this.toCommentResponse(c, userMap, (replyMap.get(c.id) ?? []).map((r) => this.toCommentResponse(r, userMap))),
    );
  }

  async createComment(goalId: string, dto: CreateCommentDto, userId: string): Promise<CommentResponseDto> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);

    // 校验父评论
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.goalId !== goal.id) {
        throw new ApiError(ErrorCode.BAD_REQUEST, { message: '父评论不存在或不属于该目标' });
      }
    }

    // 校验锚点（task 锚点需验证任务存在）
    if (dto.anchorType === CommentAnchorTypeEnum.TASK && dto.anchorId) {
      const task = await this.prisma.executionTask.findUnique({ where: { id: dto.anchorId } });
      if (!task || task.goalId !== goal.id) {
        throw new ApiError(ErrorCode.BAD_REQUEST, { message: '锚点任务不存在或不属于该目标' });
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        goalId: goal.id,
        userId,
        content: dto.content,
        parentId: dto.parentId ?? null,
        anchorType: dto.anchorType ?? null,
        anchorId: dto.anchorId ?? null,
        type: dto.type ?? CommentTypeEnum.COMMENT,
        mentions: dto.mentions?.length ? dto.mentions.join(',') : null,
      },
    });

    // 记录活动流
    await this.recordActivity({
      goalId: goal.id,
      actorId: userId,
      type: ActivityEventTypeEnum.COMMENT_CREATED,
      targetType: 'comment',
      targetId: comment.id,
      targetTitle: dto.content.slice(0, 50),
      detail: dto.anchorType ? `针对 ${dto.anchorType} 评论` : null,
    });

    // 发送通知
    const commenter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    const commenterName = commenter?.displayName ?? '未知用户';
    const commentPreview = dto.content.slice(0, 80);

    // 回复通知：通知父评论作者
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (parent && parent.userId !== userId) {
        await this.notificationService.notifyCommentReply({
          parentAuthorId: parent.userId,
          workspaceId: goal.workspaceId,
          replierName: commenterName,
          replyPreview: commentPreview,
          commentId: comment.id,
          goalId: goal.id,
        });
      }
    }

    // @提及通知：通知被提及用户（排除自己）
    if (dto.mentions && dto.mentions.length > 0) {
      const mentionedIds = dto.mentions.filter((id) => id !== userId);
      if (mentionedIds.length > 0) {
        await this.notificationService.notifyCommentMention({
          mentionedUserIds: mentionedIds,
          workspaceId: goal.workspaceId,
          commenterName,
          commentPreview,
          commentId: comment.id,
          goalId: goal.id,
        });
      }
    }

    const userMap = await this.getUserMap([userId]);
    return this.toCommentResponse(comment, userMap);
  }

  async updateComment(id: string, dto: UpdateCommentDto, userId: string): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new ApiError(ErrorCode.COLLABORATION_COMMENT_NOT_FOUND);
    }

    // 仅作者可编辑
    if (comment.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, { message: '只能编辑自己的评论' });
    }

    await this.getGoalWithMembershipCheck(comment.goalId, userId);

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { content: dto.content },
    });

    const userMap = await this.getUserMap([userId]);
    return this.toCommentResponse(updated, userMap);
  }

  async removeComment(id: string, userId: string): Promise<{ success: boolean }> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new ApiError(ErrorCode.COLLABORATION_COMMENT_NOT_FOUND);
    }

    const goal = await this.getGoalWithMembershipCheck(comment.goalId, userId);

    // 作者或工作区 admin/owner 可删除
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: goal.workspaceId, userId } },
    });
    const canDelete = comment.userId === userId || member?.role === 'owner' || member?.role === 'admin';
    if (!canDelete) {
      throw new ApiError(ErrorCode.FORBIDDEN, { message: '无权删除该评论' });
    }

    // 级联删除子回复
    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({ where: { parentId: id } }),
      this.prisma.comment.delete({ where: { id } }),
    ]);

    return { success: true };
  }

  async resolveComment(id: string, userId: string): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new ApiError(ErrorCode.COLLABORATION_COMMENT_NOT_FOUND);
    }

    await this.getGoalWithMembershipCheck(comment.goalId, userId);

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedById: userId },
    });

    // 记录活动流
    await this.recordActivity({
      goalId: comment.goalId,
      actorId: userId,
      type: ActivityEventTypeEnum.COMMENT_RESOLVED,
      targetType: 'comment',
      targetId: id,
      targetTitle: comment.content.slice(0, 50),
    });

    const userMap = await this.getUserMap([userId]);
    return this.toCommentResponse(updated, userMap);
  }

  async reopenComment(id: string, userId: string): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new ApiError(ErrorCode.COLLABORATION_COMMENT_NOT_FOUND);
    }

    await this.getGoalWithMembershipCheck(comment.goalId, userId);

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { resolvedAt: null, resolvedById: null },
    });

    const userMap = await this.getUserMap([userId]);
    return this.toCommentResponse(updated, userMap);
  }

  // ============================================================
  // 任务指派
  // ============================================================

  async assignTask(taskId: string, dto: AssignTaskDto, userId: string): Promise<AssignmentResponseDto> {
    const task = await this.prisma.executionTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_NOT_FOUND);
    }
    const goal = await this.getGoalWithMembershipCheck(task.goalId, userId);

    // 校验被指派人是工作区成员
    const assigneeMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: goal.workspaceId, userId: dto.assigneeId } },
    });
    if (!assigneeMember) {
      throw new ApiError(ErrorCode.BAD_REQUEST, { message: '被指派人不是该工作区成员' });
    }

    // 创建指派记录 + 更新任务当前指派人
    const [assignment] = await this.prisma.$transaction([
      this.prisma.assignment.create({
        data: {
          taskId,
          assigneeId: dto.assigneeId,
          assignedById: userId,
          note: dto.note ?? null,
        },
      }),
      this.prisma.executionTask.update({
        where: { id: taskId },
        data: { assigneeId: dto.assigneeId },
      }),
    ]);

    // 记录活动流
    const assignee = await this.prisma.user.findUnique({ where: { id: dto.assigneeId } });
    await this.recordActivity({
      goalId: goal.id,
      actorId: userId,
      type: ActivityEventTypeEnum.TASK_ASSIGNED,
      targetType: 'task',
      targetId: taskId,
      targetTitle: task.title,
      detail: `指派给 ${assignee?.displayName ?? '未知'}`,
    });

    // 通知被指派人（排除自己指派给自己）
    if (dto.assigneeId !== userId) {
      const assigner = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });
      await this.notificationService.notifyTaskAssigned({
        assigneeId: dto.assigneeId,
        workspaceId: goal.workspaceId,
        taskTitle: task.title,
        taskId,
        assignedByName: assigner?.displayName ?? '未知用户',
        goalId: goal.id,
      });
    }

    const userMap = await this.getUserMap([userId, dto.assigneeId]);
    return this.toAssignmentResponse(assignment, task.title, userMap);
  }

  async unassignTask(taskId: string, userId: string): Promise<{ success: boolean }> {
    const task = await this.prisma.executionTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_NOT_FOUND);
    }
    const goal = await this.getGoalWithMembershipCheck(task.goalId, userId);

    if (!task.assigneeId) {
      return { success: true };
    }

    const previousAssigneeId = task.assigneeId;
    await this.prisma.executionTask.update({
      where: { id: taskId },
      data: { assigneeId: null },
    });

    // 记录活动流
    await this.recordActivity({
      goalId: goal.id,
      actorId: userId,
      type: ActivityEventTypeEnum.TASK_UNASSIGNED,
      targetType: 'task',
      targetId: taskId,
      targetTitle: task.title,
    });

    return { success: true };
  }

  async getAssignmentHistory(taskId: string, userId: string): Promise<AssignmentHistoryDto[]> {
    const task = await this.prisma.executionTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new ApiError(ErrorCode.EXECUTION_TASK_NOT_FOUND);
    }
    await this.getGoalWithMembershipCheck(task.goalId, userId);

    const assignments = await this.prisma.assignment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = new Set<string>();
    for (const a of assignments) {
      userIds.add(a.assigneeId);
      userIds.add(a.assignedById);
    }
    const userMap = await this.getUserMap(Array.from(userIds));

    return assignments.map((a) => ({
      id: a.id,
      taskId: a.taskId,
      taskTitle: task.title,
      assignee: this.toAuthor(a.assigneeId, userMap),
      assignedBy: this.toAuthor(a.assignedById, userMap),
      note: a.note,
      isCurrent: a.assigneeId === task.assigneeId,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  /** 查询用户在当前工作区被指派的所有任务 */
  async findMyAssignments(workspaceId: string, userId: string): Promise<AssignmentResponseDto[]> {
    const tasks = await this.prisma.executionTask.findMany({
      where: { assigneeId: userId, goal: { workspaceId, deletedAt: null } },
      orderBy: { createdAt: 'desc' },
    });

    if (tasks.length === 0) return [];

    // 取每个任务最新的指派记录
    const taskIds = tasks.map((t) => t.id);
    const assignments = await this.prisma.assignment.findMany({
      where: { taskId: { in: taskIds }, assigneeId: userId },
      orderBy: { createdAt: 'desc' },
    });

    // 每个 task 取最新一条
    const latestByTask = new Map<string, (typeof assignments)[0]>();
    for (const a of assignments) {
      if (!latestByTask.has(a.taskId)) {
        latestByTask.set(a.taskId, a);
      }
    }

    const userIds = new Set<string>();
    for (const a of latestByTask.values()) {
      userIds.add(a.assigneeId);
      userIds.add(a.assignedById);
    }
    const userMap = await this.getUserMap(Array.from(userIds));

    return Array.from(latestByTask.values()).map((a) =>
      this.toAssignmentResponse(a, tasks.find((t) => t.id === a.taskId)!.title, userMap),
    );
  }

  // ============================================================
  // 活动流
  // ============================================================

  async findActivities(
    goalId: string,
    userId: string,
    query?: ActivityListQueryDto,
  ): Promise<ActivityEventDto[]> {
    const goal = await this.getGoalWithMembershipCheck(goalId, userId);

    const where: Record<string, unknown> = { goalId: goal.id };
    if (query?.type) where.type = query.type;
    if (query?.targetType) where.targetType = query.targetType;

    const limit = Math.min(query?.limit ?? 30, 100);

    const events = await this.prisma.activityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = Array.from(new Set(events.map((e) => e.actorId)));
    const userMap = await this.getUserMap(userIds);

    return events.map((e) => ({
      id: e.id,
      goalId: e.goalId,
      type: e.type as ActivityEventTypeEnum,
      typeLabel: ACTIVITY_EVENT_TYPE_LABELS[e.type as ActivityEventTypeEnum] ?? e.type,
      actor: this.toAuthor(e.actorId, userMap),
      targetType: e.targetType,
      targetId: e.targetId,
      targetTitle: e.targetTitle,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  // ============================================================
  // 公共方法：记录活动流（供其他模块调用）
  // ============================================================

  async recordActivity(params: {
    goalId: string;
    actorId: string;
    type: ActivityEventTypeEnum;
    targetType: string;
    targetId: string;
    targetTitle?: string | null;
    detail?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.activityEvent.create({
        data: {
          goalId: params.goalId,
          actorId: params.actorId,
          type: params.type,
          targetType: params.targetType,
          targetId: params.targetId,
          targetTitle: params.targetTitle ?? null,
          detail: params.detail ?? null,
        },
      });
    } catch (err) {
      // 活动流记录失败不应阻断主流程
      this.logger.warn(`记录活动流失败: ${err instanceof Error ? err.message : String(err)}`);
    }
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

  private async getUserMap(userIds: string[]): Promise<Map<string, { id: string; displayName: string; avatarUrl: string | null }>> {
    if (userIds.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    return new Map(users.map((u) => [u.id, u]));
  }

  private toAuthor(userId: string, userMap: Map<string, { id: string; displayName: string; avatarUrl: string | null }>): CommentAuthorDto {
    const user = userMap.get(userId);
    return {
      id: userId,
      displayName: user?.displayName ?? '未知用户',
      avatarUrl: user?.avatarUrl ?? null,
    };
  }

  private toCommentResponse(
    comment: {
      id: string;
      goalId: string;
      userId: string;
      content: string;
      parentId: string | null;
      anchorType: string | null;
      anchorId: string | null;
      type: string;
      mentions: string | null;
      resolvedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    userMap: Map<string, { id: string; displayName: string; avatarUrl: string | null }>,
    replies?: CommentResponseDto[],
  ): CommentResponseDto {
    return {
      id: comment.id,
      goalId: comment.goalId,
      author: this.toAuthor(comment.userId, userMap),
      content: comment.content,
      parentId: comment.parentId,
      anchorType: comment.anchorType as CommentAnchorTypeEnum | null,
      anchorId: comment.anchorId,
      type: comment.type as CommentTypeEnum,
      mentions: comment.mentions ? comment.mentions.split(',').filter(Boolean) : [],
      resolvedAt: comment.resolvedAt?.toISOString() ?? null,
      replies,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  private toAssignmentResponse(
    assignment: {
      id: string;
      taskId: string;
      assigneeId: string;
      assignedById: string;
      note: string | null;
      createdAt: Date;
    },
    taskTitle: string,
    userMap: Map<string, { id: string; displayName: string; avatarUrl: string | null }>,
  ): AssignmentResponseDto {
    return {
      id: assignment.id,
      taskId: assignment.taskId,
      taskTitle,
      assignee: this.toAuthor(assignment.assigneeId, userMap),
      assignedBy: this.toAuthor(assignment.assignedById, userMap),
      note: assignment.note,
      createdAt: assignment.createdAt.toISOString(),
    };
  }
}

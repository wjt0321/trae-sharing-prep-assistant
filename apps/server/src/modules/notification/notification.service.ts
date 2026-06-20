import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  ApiError,
  ErrorCode,
  NotificationTypeEnum,
  NotificationTargetTypeEnum,
  NOTIFICATION_TYPE_LABELS,
  type NotificationResponseDto,
  type NotificationListQueryDto,
  type UnreadCountResponseDto,
  type CreateNotificationParams,
} from '@ai-task-manager/shared';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 查询
  // ============================================================

  async findAll(
    userId: string,
    query?: NotificationListQueryDto,
  ): Promise<NotificationResponseDto[]> {
    const where: Record<string, unknown> = { userId };
    if (query?.unreadOnly) where.readAt = null;
    if (query?.type) where.type = query.type;
    if (query?.workspaceId) where.workspaceId = query.workspaceId;

    const limit = Math.min(query?.limit ?? 30, 100);

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications.map((n) => this.toResponse(n));
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    // 总未读数
    const total = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    // 按工作区分组
    const grouped = await this.prisma.notification.groupBy({
      by: ['workspaceId'],
      where: { userId, readAt: null },
      _count: { _all: true },
    });

    return {
      count: total,
      byWorkspace: grouped.map((g) => ({
        workspaceId: g.workspaceId,
        count: g._count._all,
      })),
    };
  }

  // ============================================================
  // 标记已读 / 删除
  // ============================================================

  async markAsRead(id: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new ApiError(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return this.toResponse(updated);
  }

  async markAllAsRead(userId: string, workspaceId?: string): Promise<{ success: boolean; count: number }> {
    const where: Record<string, unknown> = { userId, readAt: null };
    if (workspaceId) where.workspaceId = workspaceId;

    const result = await this.prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });

    return { success: true, count: result.count };
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new ApiError(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  // ============================================================
  // 通知生成（供其他模块调用）
  // ============================================================

  /** 创建单条通知 */
  async createNotification(params: CreateNotificationParams): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: params.userId,
          workspaceId: params.workspaceId,
          type: params.type,
          title: params.title,
          content: params.content,
          targetType: params.targetType ?? null,
          targetId: params.targetId ?? null,
        },
      });
    } catch (err) {
      // 通知创建失败不应阻断主流程
      this.logger.warn(`创建通知失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** 批量创建通知（同一事件通知多个用户） */
  async createNotifications(
    recipients: Array<{ userId: string; workspaceId: string }>,
    params: Omit<CreateNotificationParams, 'userId' | 'workspaceId'>,
  ): Promise<void> {
    if (recipients.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.userId,
          workspaceId: r.workspaceId,
          type: params.type,
          title: params.title,
          content: params.content,
          targetType: params.targetType ?? null,
          targetId: params.targetId ?? null,
        })),
      });
    } catch (err) {
      this.logger.warn(`批量创建通知失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ============================================================
  // 场景化通知（封装常用通知场景）
  // ============================================================

  /** 任务被指派时通知被指派人 */
  async notifyTaskAssigned(params: {
    assigneeId: string;
    workspaceId: string;
    taskTitle: string;
    taskId: string;
    assignedByName: string;
    goalId: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.assigneeId,
      workspaceId: params.workspaceId,
      type: NotificationTypeEnum.TASK_ASSIGNED,
      title: '你被指派了新任务',
      content: `${params.assignedByName} 将任务「${params.taskTitle}」指派给你`,
      targetType: NotificationTargetTypeEnum.TASK,
      targetId: params.taskId,
    });
  }

  /** 评论 @提及时通知被提及用户 */
  async notifyCommentMention(params: {
    mentionedUserIds: string[];
    workspaceId: string;
    commenterName: string;
    commentPreview: string;
    commentId: string;
    goalId: string;
  }): Promise<void> {
    if (params.mentionedUserIds.length === 0) return;
    await this.createNotifications(
      params.mentionedUserIds.map((userId) => ({ userId, workspaceId: params.workspaceId })),
      {
        type: NotificationTypeEnum.COMMENT_MENTION,
        title: '你在评论中被提及',
        content: `${params.commenterName}：${params.commentPreview}`,
        targetType: NotificationTargetTypeEnum.COMMENT,
        targetId: params.commentId,
      },
    );
  }

  /** 评论被回复时通知原评论作者 */
  async notifyCommentReply(params: {
    parentAuthorId: string;
    workspaceId: string;
    replierName: string;
    replyPreview: string;
    commentId: string;
    goalId: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.parentAuthorId,
      workspaceId: params.workspaceId,
      type: NotificationTypeEnum.COMMENT_REPLY,
      title: '你的评论收到了回复',
      content: `${params.replierName}：${params.replyPreview}`,
      targetType: NotificationTargetTypeEnum.COMMENT,
      targetId: params.commentId,
    });
  }

  /** 任务状态变更时通知指派人 */
  async notifyTaskStatusChanged(params: {
    assigneeId: string;
    workspaceId: string;
    taskTitle: string;
    taskId: string;
    fromStatus: string;
    toStatus: string;
    operatorName: string;
    goalId: string;
  }): Promise<void> {
    const isBlocked = params.toStatus === 'blocked';
    await this.createNotification({
      userId: params.assigneeId,
      workspaceId: params.workspaceId,
      type: isBlocked ? NotificationTypeEnum.TASK_BLOCKED : NotificationTypeEnum.TASK_STATUS_CHANGED,
      title: isBlocked ? '任务受阻' : '任务状态变更',
      content: `${params.operatorName} 将「${params.taskTitle}」从 ${params.fromStatus} 变更为 ${params.toStatus}`,
      targetType: NotificationTargetTypeEnum.TASK,
      targetId: params.taskId,
    });
  }

  /** 规划重规划时通知工作区成员（排除操作者） */
  async notifyPlanReplanned(params: {
    actorId: string;
    workspaceId: string;
    goalId: string;
    goalTitle: string;
    reason: string;
    planId: string;
  }): Promise<void> {
    // 查询工作区所有成员（排除操作者）
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: params.workspaceId, userId: { not: params.actorId } },
      select: { userId: true },
    });

    if (members.length === 0) return;

    await this.createNotifications(
      members.map((m) => ({ userId: m.userId, workspaceId: params.workspaceId })),
      {
        type: NotificationTypeEnum.PLAN_REPLANNED,
        title: '目标已重新规划',
        content: `「${params.goalTitle}」已重新规划，原因：${params.reason}`,
        targetType: NotificationTargetTypeEnum.PLAN,
        targetId: params.planId,
      },
    );
  }

  // ============================================================
  // 私有辅助
  // ============================================================

  private toResponse(n: {
    id: string;
    userId: string;
    workspaceId: string;
    type: string;
    title: string;
    content: string;
    targetType: string | null;
    targetId: string | null;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationResponseDto {
    return {
      id: n.id,
      userId: n.userId,
      workspaceId: n.workspaceId,
      type: n.type as NotificationTypeEnum,
      typeLabel: NOTIFICATION_TYPE_LABELS[n.type as NotificationTypeEnum] ?? n.type,
      title: n.title,
      content: n.content,
      targetType: n.targetType as NotificationTargetTypeEnum | null,
      targetId: n.targetId,
      isRead: n.readAt !== null,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ApiError, ErrorCode } from '@ai-task-manager/shared';

/**
 * 目标权限校验服务
 * 统一 getGoalWithMembershipCheck 逻辑，消除 5 个 service 中的重复代码
 */
@Injectable()
export class GoalPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 校验目标存在 + 用户是目标所属工作区成员
   * @returns 目标对象（已过滤软删除）
   */
  async getGoalWithMembershipCheck(goalId: string, userId: string) {
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
}

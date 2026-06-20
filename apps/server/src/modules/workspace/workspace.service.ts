import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ApiError, ErrorCode, RoleEnum, ROLE_PERMISSIONS } from '@ai-task-manager/shared';
import type { CreateWorkspaceDto } from './dto/create-workspace.dto';
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import type { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: { _count: { select: { members: true } } },
        },
      },
      orderBy: { workspace: { createdAt: 'asc' } },
    });

    return members.map((m) => this.toWorkspaceResponse(m.workspace, m.role));
  }

  async findOne(id: string, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { members: true } } },
    });
    if (!workspace) {
      throw new ApiError(ErrorCode.WORKSPACE_NOT_FOUND);
    }

    const role = await this.requireMembership(id, userId);
    return this.toWorkspaceResponse(workspace, role);
  }

  async create(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: dto.name,
          type: dto.type,
          description: dto.description,
          ownerId: userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId,
          role: RoleEnum.OWNER,
        },
      });

      return ws;
    });

    this.logger.log(`工作区创建成功: ${workspace.name} (${workspace.id})`);
    return this.toWorkspaceResponse(
      { ...workspace, _count: { members: 1 } },
      RoleEnum.OWNER,
    );
  }

  async update(id: string, dto: UpdateWorkspaceDto, userId: string) {
    const role = await this.requireMembership(id, userId);
    if (!ROLE_PERMISSIONS[role as RoleEnum].canEdit) {
      throw new ApiError(ErrorCode.FORBIDDEN);
    }

    const workspace = await this.prisma.workspace.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { _count: { select: { members: true } } },
    });

    return this.toWorkspaceResponse(workspace, role);
  }

  async remove(id: string, userId: string) {
    const role = await this.requireMembership(id, userId);
    if (!ROLE_PERMISSIONS[role as RoleEnum].canDelete) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: '只有所有者可以删除工作区',
      });
    }

    await this.prisma.workspace.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async findMembers(id: string, userId: string) {
    await this.requireMembership(id, userId);

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      displayName: m.user.displayName,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    }));
  }

  async inviteMember(id: string, dto: InviteMemberDto, userId: string) {
    const role = await this.requireMembership(id, userId);
    if (!ROLE_PERMISSIONS[role as RoleEnum].canManageMembers) {
      throw new ApiError(ErrorCode.FORBIDDEN);
    }

    // 检查目标邮箱是否已是成员
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (targetUser) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: targetUser.id } },
      });
      if (member) {
        throw new ApiError(ErrorCode.CONFLICT, {
          message: '该用户已是工作区成员',
        });
      }
    }

    // 检查是否有未过期的重复邀请
    const existingInvite = await this.prisma.invite.findFirst({
      where: {
        workspaceId: id,
        email: dto.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new ApiError(ErrorCode.CONFLICT, {
        message: '已存在未过期的邀请',
      });
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.invite.create({
      data: {
        workspaceId: id,
        email: dto.email,
        role: dto.role,
        token,
        invitedById: userId,
        expiresAt,
      },
    });

    this.logger.log(`邀请已创建: ${dto.email} -> 工作区 ${id}`);
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: { workspace: true },
    });
    if (!invite) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '邀请不存在' });
    }
    if (invite.acceptedAt) {
      throw new ApiError(ErrorCode.CONFLICT, { message: '邀请已被接受' });
    }
    if (invite.expiresAt < new Date()) {
      throw new ApiError(ErrorCode.WORKSPACE_INVITE_EXPIRED);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.email !== invite.email) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: '邀请邮箱与当前用户不匹配',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          acceptedAt: new Date(),
          acceptedById: userId,
        },
      });
    });

    this.logger.log(`邀请已接受: ${user.email} -> 工作区 ${invite.workspaceId}`);
    return {
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspace.name,
      role: invite.role,
    };
  }

  async removeMember(id: string, memberUserId: string, userId: string) {
    const role = await this.requireMembership(id, userId);
    if (!ROLE_PERMISSIONS[role as RoleEnum].canManageMembers) {
      throw new ApiError(ErrorCode.FORBIDDEN);
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: memberUserId } },
    });
    if (!member) {
      throw new ApiError(ErrorCode.WORKSPACE_MEMBER_NOT_FOUND);
    }
    if (member.role === RoleEnum.OWNER) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: '不能移除工作区所有者',
      });
    }

    await this.prisma.workspaceMember.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  async findInvites(id: string, userId: string) {
    await this.requireMembership(id, userId);

    const invites = await this.prisma.invite.findMany({
      where: { workspaceId: id, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  /**
   * 检查用户是否为工作区成员，返回角色；非成员抛 403
   */
  private async requireMembership(
    workspaceId: string,
    userId: string,
  ): Promise<string> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: '你不是该工作区的成员',
      });
    }
    return member.role;
  }

  private toWorkspaceResponse(
    workspace: {
      id: string;
      name: string;
      type: string;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
      _count?: { members: number };
    },
    role: string,
  ) {
    return {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      description: workspace.description,
      currentRole: role,
      memberCount: workspace._count?.members ?? 0,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }
}

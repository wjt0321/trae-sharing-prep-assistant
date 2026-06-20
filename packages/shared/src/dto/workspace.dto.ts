/**
 * 工作区 DTO
 * 参考：02_账号工作区与权限基础实施清单.md
 */
import type { RoleEnum, WorkspaceTypeEnum } from '../enums/index.js';

export interface CreateWorkspaceRequestDto {
  name: string;
  type: WorkspaceTypeEnum;
  description?: string;
}

export interface WorkspaceResponseDto {
  id: string;
  name: string;
  type: WorkspaceTypeEnum;
  description: string | null;
  /** 当前用户在该工作区的角色 */
  currentRole: RoleEnum;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InviteMemberRequestDto {
  email: string;
  role: RoleEnum;
}

export interface WorkspaceMemberResponseDto {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: RoleEnum;
  joinedAt: string;
}

/**
 * 角色枚举
 * 参考：02_账号工作区与权限基础实施清单.md
 */
export enum RoleEnum {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export const ROLE_LABELS: Record<RoleEnum, string> = {
  [RoleEnum.OWNER]: '所有者',
  [RoleEnum.ADMIN]: '管理员',
  [RoleEnum.EDITOR]: '编辑者',
  [RoleEnum.VIEWER]: '查看者',
};

/** 角色权限矩阵：定义每种角色的可见/可编辑/可分享/可导出范围 */
export const ROLE_PERMISSIONS: Record<RoleEnum, {
  canView: boolean;
  canEdit: boolean;
  canShare: boolean;
  canExport: boolean;
  canManageMembers: boolean;
  canDelete: boolean;
}> = {
  [RoleEnum.OWNER]: {
    canView: true,
    canEdit: true,
    canShare: true,
    canExport: true,
    canManageMembers: true,
    canDelete: true,
  },
  [RoleEnum.ADMIN]: {
    canView: true,
    canEdit: true,
    canShare: true,
    canExport: true,
    canManageMembers: true,
    canDelete: false,
  },
  [RoleEnum.EDITOR]: {
    canView: true,
    canEdit: true,
    canShare: false,
    canExport: true,
    canManageMembers: false,
    canDelete: false,
  },
  [RoleEnum.VIEWER]: {
    canView: true,
    canEdit: false,
    canShare: false,
    canExport: false,
    canManageMembers: false,
    canDelete: false,
  },
};

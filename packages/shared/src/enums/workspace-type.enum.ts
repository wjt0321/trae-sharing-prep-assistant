/**
 * 工作区类型枚举
 * 参考：02_账号工作区与权限基础实施清单.md
 */
export enum WorkspaceTypeEnum {
  PERSONAL = 'personal',
  TEAM = 'team',
}

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceTypeEnum, string> = {
  [WorkspaceTypeEnum.PERSONAL]: '个人工作区',
  [WorkspaceTypeEnum.TEAM]: '团队工作区',
};

/**
 * 后端模块名枚举
 * 参考：11_后端平台数据层与AI基础设施实施清单.md（模块化单体）
 */
export enum ModuleNameEnum {
  AUTH = 'auth',
  WORKSPACE = 'workspace',
  GOAL = 'goal',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  KNOWLEDGE = 'knowledge',
  COLLABORATION = 'collaboration',
  EXPORT = 'export',
  INTEGRATION = 'integration',
}

export const ALL_MODULE_NAMES: ModuleNameEnum[] = [
  ModuleNameEnum.AUTH,
  ModuleNameEnum.WORKSPACE,
  ModuleNameEnum.GOAL,
  ModuleNameEnum.PLANNING,
  ModuleNameEnum.EXECUTION,
  ModuleNameEnum.KNOWLEDGE,
  ModuleNameEnum.COLLABORATION,
  ModuleNameEnum.EXPORT,
  ModuleNameEnum.INTEGRATION,
];

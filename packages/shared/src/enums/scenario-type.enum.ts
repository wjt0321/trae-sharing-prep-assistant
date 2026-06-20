/**
 * 场景类型枚举
 * 参考：03_目标创建器与场景识别实施清单.md
 *
 * 优先支持的场景：
 * - 分享 / 培训 / 汇报准备
 * - 比赛项目推进
 * - 内容创作规划
 * - 小项目起步
 * - 学习目标拆解
 */
export enum ScenarioTypeEnum {
  /** 分享 / 培训 / 汇报准备 */
  SHARING_PREP = 'sharing_prep',
  /** 比赛项目推进 */
  COMPETITION = 'competition',
  /** 内容创作规划 */
  CONTENT_CREATION = 'content_creation',
  /** 小项目起步 */
  SMALL_PROJECT = 'small_project',
  /** 学习目标拆解 */
  LEARNING = 'learning',
  /** 未知 / 待识别 */
  UNKNOWN = 'unknown',
}

export const SCENARIO_TYPE_LABELS: Record<ScenarioTypeEnum, string> = {
  [ScenarioTypeEnum.SHARING_PREP]: '分享 / 培训 / 汇报准备',
  [ScenarioTypeEnum.COMPETITION]: '比赛项目推进',
  [ScenarioTypeEnum.CONTENT_CREATION]: '内容创作规划',
  [ScenarioTypeEnum.SMALL_PROJECT]: '小项目起步',
  [ScenarioTypeEnum.LEARNING]: '学习目标拆解',
  [ScenarioTypeEnum.UNKNOWN]: '待识别',
};

/**
 * 场景识别的推荐字段提示
 * 用于前端分段引导：每个场景下应优先补全的字段
 */
export const SCENARIO_FIELD_HINTS: Record<ScenarioTypeEnum, string[]> = {
  [ScenarioTypeEnum.SHARING_PREP]: ['audience', 'duration', 'shareDate', 'goalType', 'preparedness'],
  [ScenarioTypeEnum.COMPETITION]: ['timeConstraint', 'resourceConstraint', 'successCriteria'],
  [ScenarioTypeEnum.CONTENT_CREATION]: ['audience', 'successCriteria', 'resourceConstraint'],
  [ScenarioTypeEnum.SMALL_PROJECT]: ['timeConstraint', 'resourceConstraint', 'isCollaborative'],
  [ScenarioTypeEnum.LEARNING]: ['successCriteria', 'timeConstraint'],
  [ScenarioTypeEnum.UNKNOWN]: ['audience', 'timeConstraint', 'successCriteria'],
};

/** 目标优先级 */
export enum GoalPriorityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export const GOAL_PRIORITY_LABELS: Record<GoalPriorityEnum, string> = {
  [GoalPriorityEnum.LOW]: '低',
  [GoalPriorityEnum.MEDIUM]: '中',
  [GoalPriorityEnum.HIGH]: '高',
  [GoalPriorityEnum.URGENT]: '紧急',
};

/** 目标当前阶段 */
export enum GoalStageEnum {
  /** 灵感录入 */
  INSPIRATION = 'inspiration',
  /** 上下文确认 */
  CONTEXT = 'context',
  /** 规划中 */
  PLANNING = 'planning',
  /** 执行中 */
  EXECUTING = 'executing',
  /** 已完成 */
  DONE = 'done',
  /** 已归档 */
  ARCHIVED = 'archived',
}

export const GOAL_STAGE_LABELS: Record<GoalStageEnum, string> = {
  [GoalStageEnum.INSPIRATION]: '灵感录入',
  [GoalStageEnum.CONTEXT]: '上下文确认',
  [GoalStageEnum.PLANNING]: '规划中',
  [GoalStageEnum.EXECUTING]: '执行中',
  [GoalStageEnum.DONE]: '已完成',
  [GoalStageEnum.ARCHIVED]: '已归档',
};

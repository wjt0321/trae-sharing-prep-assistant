/**
 * 目标类型枚举
 * 沿用 legacy-demo 中 demoTemplates.js 的 goalOptions
 */
export enum GoalTypeEnum {
  INFORM = 'inform',
  PERSUADE = 'persuade',
  TEACH = 'teach',
  REVIEW = 'review',
}

export const GOAL_TYPE_LABELS: Record<GoalTypeEnum, string> = {
  [GoalTypeEnum.INFORM]: '传递信息',
  [GoalTypeEnum.PERSUADE]: '说服认同',
  [GoalTypeEnum.TEACH]: '教学示范',
  [GoalTypeEnum.REVIEW]: '复盘总结',
};

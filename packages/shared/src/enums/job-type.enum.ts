/**
 * 异步任务类型枚举
 * 参考：11_后端平台数据层与AI基础设施实施清单.md
 * 用于 TaskJob 表的 type 字段，标识不同种类的后台任务
 */
export enum JobTypeEnum {
  PLAN_GENERATION = 'plan_generation',
  REPLAN = 'replan',
  EXPORT = 'export',
  NOTIFICATION = 'notification',
  AI_CALL = 'ai_call',
  KNOWLEDGE_INDEX = 'knowledge_index',
  CLEANUP = 'cleanup',
}

export const JOB_TYPE_LABELS: Record<JobTypeEnum, string> = {
  [JobTypeEnum.PLAN_GENERATION]: '规划生成',
  [JobTypeEnum.REPLAN]: '重规划',
  [JobTypeEnum.EXPORT]: '导出',
  [JobTypeEnum.NOTIFICATION]: '通知',
  [JobTypeEnum.AI_CALL]: 'AI 调用',
  [JobTypeEnum.KNOWLEDGE_INDEX]: '知识索引',
  [JobTypeEnum.CLEANUP]: '清理',
};

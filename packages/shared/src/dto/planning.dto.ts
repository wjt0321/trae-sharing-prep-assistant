/**
 * 规划 DTO
 * 参考：04_AI规划与重规划引擎实施清单.md
 *
 * 规划输出结构：阶段 / 任务 / 风险 / 里程碑 / 下一步动作 / 说明与假设
 * Plan.content 以 JSON 字符串存储 PlanContent 结构
 */

/** 规划任务优先级 */
export type PlanTaskPriority = 'low' | 'medium' | 'high';

/** 规划任务 */
export interface PlanTask {
  id: string;
  title: string;
  description: string;
  priority: PlanTaskPriority;
  /** 预估工时（小时） */
  estimatedHours?: number;
  /** 依赖的任务 ID 列表 */
  dependencies?: string[];
}

/** 规划阶段 */
export interface PlanPhase {
  id: string;
  name: string;
  description: string;
  /** 阶段顺序 */
  order: number;
  tasks: PlanTask[];
}

/** 风险影响等级 */
export type RiskImpact = 'low' | 'medium' | 'high';

/** 风险项 */
export interface PlanRisk {
  id: string;
  description: string;
  impact: RiskImpact;
  /** 缓解措施 */
  mitigation: string;
}

/** 里程碑 */
export interface PlanMilestone {
  id: string;
  name: string;
  description: string;
  /** 目标日期（ISO 8601） */
  targetDate?: string;
}

/**
 * 规划内容（存储在 Plan.content 的 JSON 结构）
 * 统一输出对象：阶段 / 任务 / 风险 / 里程碑 / 下一步动作 / 说明与假设
 */
export interface PlanContent {
  /** 规划摘要 */
  summary: string;
  /** 阶段列表（含任务） */
  phases: PlanPhase[];
  /** 风险列表 */
  risks: PlanRisk[];
  /** 里程碑列表 */
  milestones: PlanMilestone[];
  /** 下一步动作 */
  nextActions: string[];
  /** 说明与假设 */
  assumptions: string[];
}

/** 规划来源 */
export type PlanSource = 'rule_engine' | 'ai' | 'hybrid';

/** 规划版本响应 */
export interface PlanResponseDto {
  id: string;
  goalId: string;
  version: number;
  isActive: boolean;
  content: PlanContent;
  source: PlanSource;
  /** 版本变更原因（首版为 null，重规划为原因） */
  changeReason: string | null;
  /** 重规划原因（兼容字段，同 changeReason） */
  replanReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 生成规划请求 */
export interface GeneratePlanRequestDto {
  /** 是否强制重新生成（忽略已有活跃版本） */
  force?: boolean;
}

/** 重规划请求 */
export interface ReplanRequestDto {
  /** 重规划原因 */
  reason: string;
  /** 修改后的约束（可选，用于指导重规划） */
  constraintChanges?: {
    timeConstraint?: string;
    resourceConstraint?: string;
    successCriteria?: string;
  };
}

/** 方案差异项 */
export interface PlanDiffItem {
  type: 'added' | 'removed' | 'modified';
  /** 差异所在区域：phase / task / risk / milestone / nextAction / assumption */
  area: string;
  /** 变更描述 */
  description: string;
  /** 旧值（modified 时有值） */
  oldValue?: string;
  /** 新值（modified / added 时有值） */
  newValue?: string;
}

/** 方案比较响应 */
export interface PlanCompareResponseDto {
  /** 版本 A */
  versionA: { version: number; createdAt: string };
  /** 版本 B */
  versionB: { version: number; createdAt: string };
  /** 差异列表 */
  diffs: PlanDiffItem[];
  /** 差异原因摘要 */
  summary: string;
}

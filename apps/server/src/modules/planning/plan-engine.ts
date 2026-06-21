import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ScenarioTypeEnum,
  type PlanContent,
  type PlanPhase,
  type PlanMilestone,
  type PlanTaskPriority,
  type RiskImpact,
} from '@ai-task-manager/shared';
import sharingPrepTemplate from './templates/sharing-prep.json';
import competitionTemplate from './templates/competition.json';
import contentCreationTemplate from './templates/content-creation.json';
import smallProjectTemplate from './templates/small-project.json';
import learningTemplate from './templates/learning.json';
import unknownTemplate from './templates/unknown.json';

/**
 * 场景模板类型
 */
interface ScenarioTemplate {
  phases: Array<{
    name: string;
    description: string;
    order: number;
    tasks: Array<{ title: string; description: string; priority: string }>;
  }>;
  risks: Array<{ description: string; impact: string; mitigation: string }>;
  milestones: Array<{ name: string; description: string }>;
  nextActions: string[];
  assumptions: string[];
}

// ============================================================
// 类型守卫：替代 as 断言，提供运行时校验
// ============================================================

const VALID_SCENARIO_TYPES = new Set<string>(Object.values(ScenarioTypeEnum));
const VALID_PRIORITIES = new Set<string>(['low', 'medium', 'high']);
const VALID_IMPACTS = new Set<string>(['low', 'medium', 'high']);

/** 校验字符串是否为合法 ScenarioTypeEnum 值 */
function isScenarioType(value: string): value is ScenarioTypeEnum {
  return VALID_SCENARIO_TYPES.has(value);
}

/** 校验字符串是否为合法 PlanTaskPriority 值 */
function isPlanTaskPriority(value: string): value is PlanTaskPriority {
  return VALID_PRIORITIES.has(value);
}

/** 校验字符串是否为合法 RiskImpact 值 */
function isRiskImpact(value: string): value is RiskImpact {
  return VALID_IMPACTS.has(value);
}

/** 安全解析场景类型，非法值回退到 UNKNOWN */
function parseScenarioType(value: string | null): ScenarioTypeEnum {
  if (value && isScenarioType(value)) {
    return value;
  }
  return ScenarioTypeEnum.UNKNOWN;
}

/** 校验未知数据是否符合 ScenarioTemplate 结构 */
function isScenarioTemplate(data: unknown): data is ScenarioTemplate {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.phases) &&
    Array.isArray(obj.risks) &&
    Array.isArray(obj.milestones) &&
    Array.isArray(obj.nextActions) &&
    Array.isArray(obj.assumptions)
  );
}

/** 加载并校验 JSON 模板，校验失败时抛错（启动期暴露问题） */
function loadTemplate(data: unknown, name: string): ScenarioTemplate {
  if (!isScenarioTemplate(data)) {
    throw new Error(`场景模板 ${name} 结构校验失败：缺少必要字段`);
  }
  return data;
}

/**
 * 规划引擎（规则引擎 mock）
 * 参考：04_AI规划与重规划引擎实施清单.md
 *
 * 当前阶段：基于场景类型 + 目标上下文，用规则引擎生成结构化规划
 * 后续升级：接入 AiGateway 调用大模型，规则引擎作为 fallback
 *
 * 模板外置：6 个场景模板存放在 templates/*.json，本引擎负责加载与个性化
 */
@Injectable()
export class PlanEngine {
  private readonly logger = new Logger(PlanEngine.name);

  /**
   * 场景模板表（启动时一次性加载，运行时只读）
   */
  private readonly templates: Record<ScenarioTypeEnum, ScenarioTemplate> = {
    [ScenarioTypeEnum.SHARING_PREP]: loadTemplate(sharingPrepTemplate, 'sharing-prep'),
    [ScenarioTypeEnum.COMPETITION]: loadTemplate(competitionTemplate, 'competition'),
    [ScenarioTypeEnum.CONTENT_CREATION]: loadTemplate(contentCreationTemplate, 'content-creation'),
    [ScenarioTypeEnum.SMALL_PROJECT]: loadTemplate(smallProjectTemplate, 'small-project'),
    [ScenarioTypeEnum.LEARNING]: loadTemplate(learningTemplate, 'learning'),
    [ScenarioTypeEnum.UNKNOWN]: loadTemplate(unknownTemplate, 'unknown'),
  };

  /**
   * 生成首版规划
   */
  generatePlan(goal: {
    topic: string;
    title: string | null;
    scenarioType: string | null;
    audience: string | null;
    duration: number | null;
    shareDate: string | null;
    timeConstraint: string | null;
    resourceConstraint: string | null;
    successCriteria: string | null;
    isCollaborative: boolean;
  }): PlanContent {
    const scenario = parseScenarioType(goal.scenarioType);
    const template = this.getTemplate(scenario);

    // 根据目标上下文个性化模板
    const phases = template.phases.map((p) => this.personalizePhase(p, goal));
    const risks = template.risks.map((r) => ({
      ...r,
      id: randomUUID(),
      impact: isRiskImpact(r.impact) ? r.impact : 'medium',
    }));
    const milestones = template.milestones.map((m) => this.personalizeMilestone(m, goal));
    const nextActions = template.nextActions;
    const assumptions = this.buildAssumptions(goal, template.assumptions);

    const summary = this.buildSummary(goal, scenario, template);

    this.logger.log(`规划已生成: scenario=${scenario}, phases=${phases.length}, tasks=${phases.reduce((s, p) => s + p.tasks.length, 0)}`);

    return {
      summary,
      phases,
      risks,
      milestones,
      nextActions,
      assumptions,
    };
  }

  /**
   * 重规划：基于现有规划 + 约束变化生成新版本
   */
  replan(
    currentPlan: PlanContent,
    goal: {
      topic: string;
      title: string | null;
      scenarioType: string | null;
      audience: string | null;
      duration: number | null;
      shareDate: string | null;
      timeConstraint: string | null;
      resourceConstraint: string | null;
      successCriteria: string | null;
      isCollaborative: boolean;
    },
    reason: string,
    constraintChanges?: {
      timeConstraint?: string;
      resourceConstraint?: string;
      successCriteria?: string;
    },
  ): PlanContent {
    // 合并约束变化到目标上下文
    const mergedGoal = { ...goal };
    if (constraintChanges?.timeConstraint !== undefined) {
      mergedGoal.timeConstraint = constraintChanges.timeConstraint;
    }
    if (constraintChanges?.resourceConstraint !== undefined) {
      mergedGoal.resourceConstraint = constraintChanges.resourceConstraint;
    }
    if (constraintChanges?.successCriteria !== undefined) {
      mergedGoal.successCriteria = constraintChanges.successCriteria;
    }

    // 重新生成规划（基于更新后的上下文）
    const newPlan = this.generatePlan(mergedGoal);

    // 在摘要中标注重规划原因
    newPlan.summary = `[重规划：${reason}] ${newPlan.summary}`;

    // 保留原有里程碑（如果用户已确认过）
    if (currentPlan.milestones.length > 0 && !constraintChanges) {
      newPlan.milestones = currentPlan.milestones;
    }

    return newPlan;
  }

  /**
   * 比较两个版本的差异
   */
  compare(versionA: PlanContent, versionB: PlanContent): {
    diffs: Array<{
      type: 'added' | 'removed' | 'modified';
      area: string;
      description: string;
      oldValue?: string;
      newValue?: string;
    }>;
    summary: string;
  } {
    const diffs: Array<{
      type: 'added' | 'removed' | 'modified';
      area: string;
      description: string;
      oldValue?: string;
      newValue?: string;
    }> = [];

    // 比较摘要
    if (versionA.summary !== versionB.summary) {
      diffs.push({
        type: 'modified',
        area: 'summary',
        description: '规划摘要变更',
        oldValue: versionA.summary,
        newValue: versionB.summary,
      });
    }

    // 比较阶段
    const phasesA = new Map(versionA.phases.map((p) => [p.name, p]));
    const phasesB = new Map(versionB.phases.map((p) => [p.name, p]));
    for (const [name, phaseB] of phasesB) {
      if (!phasesA.has(name)) {
        diffs.push({
          type: 'added',
          area: 'phase',
          description: `新增阶段：${name}`,
          newValue: phaseB.description,
        });
      }
    }
    for (const [name, phaseA] of phasesA) {
      if (!phasesB.has(name)) {
        diffs.push({
          type: 'removed',
          area: 'phase',
          description: `移除阶段：${name}`,
          oldValue: phaseA.description,
        });
      }
    }

    // 比较任务总数
    const tasksA = versionA.phases.flatMap((p) => p.tasks);
    const tasksB = versionB.phases.flatMap((p) => p.tasks);
    const taskTitlesA = new Set(tasksA.map((t) => t.title));
    const taskTitlesB = new Set(tasksB.map((t) => t.title));
    const addedTasks = [...taskTitlesB].filter((t) => !taskTitlesA.has(t));
    const removedTasks = [...taskTitlesA].filter((t) => !taskTitlesB.has(t));
    for (const t of addedTasks) {
      diffs.push({ type: 'added', area: 'task', description: `新增任务：${t}` });
    }
    for (const t of removedTasks) {
      diffs.push({ type: 'removed', area: 'task', description: `移除任务：${t}` });
    }

    // 比较风险
    const risksA = new Set(versionA.risks.map((r) => r.description));
    const risksB = new Set(versionB.risks.map((r) => r.description));
    for (const r of [...risksB].filter((r) => !risksA.has(r))) {
      diffs.push({ type: 'added', area: 'risk', description: `新增风险：${r}` });
    }
    for (const r of [...risksA].filter((r) => !risksB.has(r))) {
      diffs.push({ type: 'removed', area: 'risk', description: `移除风险：${r}` });
    }

    // 比较下一步动作
    const actionsA = new Set(versionA.nextActions);
    const actionsB = new Set(versionB.nextActions);
    for (const a of [...actionsB].filter((a) => !actionsA.has(a))) {
      diffs.push({ type: 'added', area: 'nextAction', description: `新增下一步：${a}` });
    }
    for (const a of [...actionsA].filter((a) => !actionsB.has(a))) {
      diffs.push({ type: 'removed', area: 'nextAction', description: `移除下一步：${a}` });
    }

    const summary = `共 ${diffs.length} 处差异：新增 ${diffs.filter((d) => d.type === 'added').length}，移除 ${diffs.filter((d) => d.type === 'removed').length}，修改 ${diffs.filter((d) => d.type === 'modified').length}`;

    return { diffs, summary };
  }

  // ============================================================
  // 模板加载
  // ============================================================

  private getTemplate(scenario: ScenarioTypeEnum): ScenarioTemplate {
    return this.templates[scenario] ?? this.templates[ScenarioTypeEnum.UNKNOWN];
  }

  // ============================================================
  // 个性化辅助
  // ============================================================

  private personalizePhase(
    phase: ScenarioTemplate['phases'][number],
    goal: { audience: string | null; duration: number | null; shareDate: string | null; timeConstraint: string | null },
  ): PlanPhase {
    return {
      id: randomUUID(),
      name: phase.name,
      description: phase.description,
      order: phase.order,
      tasks: phase.tasks.map((t) => ({
        ...t,
        id: randomUUID(),
        priority: isPlanTaskPriority(t.priority) ? t.priority : 'medium',
      })),
    };
  }

  private personalizeMilestone(
    milestone: ScenarioTemplate['milestones'][number],
    goal: { shareDate: string | null },
  ): PlanMilestone {
    const m: PlanMilestone = {
      id: randomUUID(),
      name: milestone.name,
      description: milestone.description,
    };
    // 如果有分享日期，给最后一个里程碑设为目标日期
    if (goal.shareDate && (milestone.name.includes('完成') || milestone.name.includes('上线'))) {
      m.targetDate = goal.shareDate ?? undefined;
    }
    return m;
  }

  private buildAssumptions(
    goal: { timeConstraint: string | null; resourceConstraint: string | null; isCollaborative: boolean },
    templateAssumptions: string[],
  ): string[] {
    const assumptions = [...templateAssumptions];
    if (goal.timeConstraint) {
      assumptions.push(`时间约束：${goal.timeConstraint}`);
    }
    if (goal.resourceConstraint) {
      assumptions.push(`资源约束：${goal.resourceConstraint}`);
    }
    if (goal.isCollaborative) {
      assumptions.push('多人协作模式，需明确分工');
    }
    return assumptions;
  }

  private buildSummary(
    goal: { topic: string; title: string | null; successCriteria: string | null },
    scenario: ScenarioTypeEnum,
    template: { phases: unknown[] },
  ): string {
    const title = goal.title || goal.topic;
    const phaseCount = template.phases.length;
    const scenarioLabel = this.scenarioLabel(scenario);
    let summary = `针对「${title}」生成 ${phaseCount} 阶段规划（${scenarioLabel}）`;
    if (goal.successCriteria) {
      summary += `，目标达成标准：${goal.successCriteria}`;
    }
    return summary;
  }

  private scenarioLabel(scenario: ScenarioTypeEnum): string {
    const labels: Record<ScenarioTypeEnum, string> = {
      [ScenarioTypeEnum.SHARING_PREP]: '分享准备',
      [ScenarioTypeEnum.COMPETITION]: '比赛项目',
      [ScenarioTypeEnum.CONTENT_CREATION]: '内容创作',
      [ScenarioTypeEnum.SMALL_PROJECT]: '小项目',
      [ScenarioTypeEnum.LEARNING]: '学习目标',
      [ScenarioTypeEnum.UNKNOWN]: '通用',
    };
    return labels[scenario];
  }
}

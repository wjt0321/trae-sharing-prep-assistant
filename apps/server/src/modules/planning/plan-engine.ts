import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ScenarioTypeEnum,
  type PlanContent,
  type PlanPhase,
  type PlanRisk,
  type PlanMilestone,
  type PlanTask,
  type PlanTaskPriority,
  type RiskImpact,
} from '@ai-task-manager/shared';

/**
 * 规划引擎（规则引擎 mock）
 * 参考：04_AI规划与重规划引擎实施清单.md
 *
 * 当前阶段：基于场景类型 + 目标上下文，用规则引擎生成结构化规划
 * 后续升级：接入 AiGateway 调用大模型，规则引擎作为 fallback
 */
@Injectable()
export class PlanEngine {
  private readonly logger = new Logger(PlanEngine.name);

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
    const scenario = (goal.scenarioType as ScenarioTypeEnum) ?? ScenarioTypeEnum.UNKNOWN;
    const template = this.getTemplate(scenario);

    // 根据目标上下文个性化模板
    const phases = template.phases.map((p) => this.personalizePhase(p, goal));
    const risks = template.risks.map((r) => ({ ...r, id: randomUUID(), impact: r.impact as RiskImpact }));
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
  // 场景模板
  // ============================================================

  private getTemplate(scenario: ScenarioTypeEnum): {
    phases: Array<Omit<PlanPhase, 'id' | 'tasks'> & { tasks: Omit<PlanTask, 'id'>[] }>;
    risks: Array<{ description: string; impact: string; mitigation: string }>;
    milestones: Omit<PlanMilestone, 'id'>[];
    nextActions: string[];
    assumptions: string[];
  } {
    switch (scenario) {
      case ScenarioTypeEnum.SHARING_PREP:
        return this.sharingPrepTemplate();
      case ScenarioTypeEnum.COMPETITION:
        return this.competitionTemplate();
      case ScenarioTypeEnum.CONTENT_CREATION:
        return this.contentCreationTemplate();
      case ScenarioTypeEnum.SMALL_PROJECT:
        return this.smallProjectTemplate();
      case ScenarioTypeEnum.LEARNING:
        return this.learningTemplate();
      default:
        return this.unknownTemplate();
    }
  }

  private sharingPrepTemplate() {
    return {
      phases: [
        {
          name: '准备阶段',
          description: '明确分享目标、受众分析与内容定位',
          order: 1,
          tasks: [
            { title: '确定分享主题与核心信息', description: '提炼 1-3 个核心要点', priority: 'high' as PlanTaskPriority },
            { title: '分析受众背景与需求', description: '了解听众的知识水平与期望', priority: 'medium' as PlanTaskPriority },
            { title: '确定分享形式与时长分配', description: '讲解 / 演示 / 互动的比例', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '内容制作',
          description: '搭建大纲、制作素材与演示材料',
          order: 2,
          tasks: [
            { title: '搭建内容大纲', description: '开场 → 主体 → 结尾的结构', priority: 'high' as PlanTaskPriority },
            { title: '制作演示材料', description: 'PPT / 代码 demo / 案例素材', priority: 'high' as PlanTaskPriority },
            { title: '准备互动环节', description: '提问 / 练习 / 讨论设计', priority: 'low' as PlanTaskPriority },
          ],
        },
        {
          name: '试讲演练',
          description: '内部试讲、收集反馈与迭代',
          order: 3,
          tasks: [
            { title: '完成首次试讲', description: '至少 1 次完整试讲', priority: 'high' as PlanTaskPriority },
            { title: '收集反馈并迭代', description: '根据反馈调整内容与节奏', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '正式分享',
          description: '现场交付与后续跟进',
          order: 4,
          tasks: [
            { title: '完成正式分享', description: '按计划交付', priority: 'high' as PlanTaskPriority },
            { title: '整理分享资料与回顾', description: '归档材料、收集听众反馈', priority: 'low' as PlanTaskPriority },
          ],
        },
      ],
      risks: [
        { description: '内容过多导致超时', impact: 'medium', mitigation: '预留 20% 时间缓冲，准备可裁剪内容' },
        { description: '受众水平差异大', impact: 'medium', mitigation: '准备基础与进阶两层内容' },
        { description: '演示环境出问题', impact: 'high', mitigation: '提前测试环境，准备离线方案' },
      ],
      milestones: [
        { name: '大纲定稿', description: '内容大纲确认完成' },
        { name: '材料就绪', description: '所有演示材料制作完成' },
        { name: '试讲通过', description: '试讲反馈达标' },
        { name: '分享完成', description: '正式分享交付' },
      ],
      nextActions: [
        '先确定分享的核心主题与 1-3 个要点',
        '列出目标受众的特征与期望',
        '搭建内容大纲的初版框架',
      ],
      assumptions: [
        '分享日期已确定或可协调',
        '有基本的演示工具可用',
        '受众规模在可控范围内',
      ],
    };
  }

  private competitionTemplate() {
    return {
      phases: [
        {
          name: '需求分析',
          description: '理解赛题、明确评审标准与约束',
          order: 1,
          tasks: [
            { title: '研读赛题与评审标准', description: '理解评分维度与硬性要求', priority: 'high' as PlanTaskPriority },
            { title: '竞品与往届方案调研', description: '了解同类方案的优势与不足', priority: 'medium' as PlanTaskPriority },
            { title: '确定差异化策略', description: '找到创新点与亮点', priority: 'high' as PlanTaskPriority },
          ],
        },
        {
          name: '方案设计',
          description: '技术选型、架构设计与原型验证',
          order: 2,
          tasks: [
            { title: '确定技术方案与架构', description: '技术栈选型与系统设计', priority: 'high' as PlanTaskPriority },
            { title: '制作原型验证核心可行性', description: 'POC 验证关键技术', priority: 'high' as PlanTaskPriority },
            { title: '规划开发里程碑', description: '按时间节点拆分开发任务', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '开发实现',
          description: '核心功能开发与集成',
          order: 3,
          tasks: [
            { title: '开发核心功能模块', description: '按优先级实现核心特性', priority: 'high' as PlanTaskPriority },
            { title: '集成与联调', description: '模块集成、接口联调', priority: 'high' as PlanTaskPriority },
            { title: 'UI / 交互打磨', description: '用户体验优化', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '测试优化',
          description: '功能测试、性能优化与 Bug 修复',
          order: 4,
          tasks: [
            { title: '功能测试与 Bug 修复', description: '核心流程跑通', priority: 'high' as PlanTaskPriority },
            { title: '性能与稳定性优化', description: '压力测试与优化', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '提交答辩',
          description: '材料准备、演示视频与答辩',
          order: 5,
          tasks: [
            { title: '准备提交材料', description: '文档、代码、演示', priority: 'high' as PlanTaskPriority },
            { title: '制作演示视频', description: '核心功能演示', priority: 'high' as PlanTaskPriority },
            { title: '准备答辩材料', description: 'PPT、问答预案', priority: 'medium' as PlanTaskPriority },
          ],
        },
      ],
      risks: [
        { description: '时间不足导致功能裁剪', impact: 'high', mitigation: '按优先级裁剪，保证核心功能完整' },
        { description: '技术方案不可行', impact: 'high', mitigation: '尽早 POC 验证，准备备选方案' },
        { description: '团队协作沟通成本', impact: 'medium', mitigation: '明确分工与每日同步' },
      ],
      milestones: [
        { name: '方案确定', description: '技术方案与架构确认' },
        { name: '核心功能完成', description: 'MVP 功能开发完成' },
        { name: '测试通过', description: '核心流程测试通过' },
        { name: '提交完成', description: '参赛材料提交' },
      ],
      nextActions: [
        '仔细研读赛题与评审标准',
        '调研往届优秀方案',
        '确定你的差异化亮点',
      ],
      assumptions: [
        '参赛时间节点已明确',
        '团队成员与分工已确定（如团队赛）',
        '开发环境与工具已就绪',
      ],
    };
  }

  private contentCreationTemplate() {
    return {
      phases: [
        {
          name: '选题定位',
          description: '确定内容方向、目标读者与差异化',
          order: 1,
          tasks: [
            { title: '确定内容方向与主题', description: '找到有价值的选题', priority: 'high' as PlanTaskPriority },
            { title: '分析目标读者画像', description: '了解读者需求与痛点', priority: 'medium' as PlanTaskPriority },
            { title: '确定内容形式与平台', description: '图文 / 视频 / 音频 + 发布平台', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '内容规划',
          description: '内容大纲、系列规划与更新节奏',
          order: 2,
          tasks: [
            { title: '搭建内容大纲', description: '系列内容的结构设计', priority: 'high' as PlanTaskPriority },
            { title: '制定更新计划', description: '发布频率与时间安排', priority: 'medium' as PlanTaskPriority },
            { title: '建立素材库', description: '收集参考资料与案例', priority: 'low' as PlanTaskPriority },
          ],
        },
        {
          name: '创作执行',
          description: '内容创作、编辑与质量把控',
          order: 3,
          tasks: [
            { title: '完成首批内容创作', description: '先做 3-5 篇建立基调', priority: 'high' as PlanTaskPriority },
            { title: '内容审校与优化', description: '质量把关与排版', priority: 'medium' as PlanTaskPriority },
            { title: '配图与视觉素材', description: '提升内容可读性', priority: 'low' as PlanTaskPriority },
          ],
        },
        {
          name: '发布运营',
          description: '发布、推广与数据复盘',
          order: 4,
          tasks: [
            { title: '按计划发布内容', description: '保持更新节奏', priority: 'high' as PlanTaskPriority },
            { title: '社群与渠道推广', description: '扩大内容触达', priority: 'medium' as PlanTaskPriority },
            { title: '数据复盘与迭代', description: '根据数据调整策略', priority: 'medium' as PlanTaskPriority },
          ],
        },
      ],
      risks: [
        { description: '选题同质化严重', impact: 'medium', mitigation: '找到独特视角或垂直细分' },
        { description: '难以坚持更新节奏', impact: 'high', mitigation: '建立素材库，批量创作' },
        { description: '内容质量不稳定', impact: 'medium', mitigation: '建立审校流程与质量标准' },
      ],
      milestones: [
        { name: '选题确定', description: '内容方向与主题确认' },
        { name: '大纲完成', description: '系列内容大纲定稿' },
        { name: '首批发布', description: '前 3-5 篇内容发布' },
        { name: '稳定更新', description: '建立可持续更新节奏' },
      ],
      nextActions: [
        '确定你想创作的内容方向',
        '分析目标读者是谁、他们关心什么',
        '列出 5-10 个候选选题',
      ],
      assumptions: [
        '有基本的创作工具与平台账号',
        '能保证一定的创作时间投入',
        '内容方向有足够的素材支撑',
      ],
    };
  }

  private smallProjectTemplate() {
    return {
      phases: [
        {
          name: '需求定义',
          description: '明确项目目标、范围与 MVP 边界',
          order: 1,
          tasks: [
            { title: '定义项目目标与成功标准', description: '明确做到什么程度算成功', priority: 'high' as PlanTaskPriority },
            { title: '确定 MVP 范围', description: '最小可用版本的功能边界', priority: 'high' as PlanTaskPriority },
            { title: '梳理用户故事', description: '核心用户流程', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '设计',
          description: '技术方案、架构与界面设计',
          order: 2,
          tasks: [
            { title: '技术选型与架构设计', description: '确定技术栈与系统架构', priority: 'high' as PlanTaskPriority },
            { title: '数据库与接口设计', description: '数据模型与 API 设计', priority: 'high' as PlanTaskPriority },
            { title: '界面原型设计', description: '核心页面原型', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '开发',
          description: '核心功能开发',
          order: 3,
          tasks: [
            { title: '搭建项目骨架', description: '工程结构、基础配置', priority: 'high' as PlanTaskPriority },
            { title: '开发核心功能', description: '按优先级实现 MVP 功能', priority: 'high' as PlanTaskPriority },
            { title: '接口联调', description: '前后端集成', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '测试',
          description: '功能测试与问题修复',
          order: 4,
          tasks: [
            { title: '核心流程测试', description: '主流程跑通', priority: 'high' as PlanTaskPriority },
            { title: 'Bug 修复与优化', description: '问题修复与体验优化', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '上线',
          description: '部署上线与后续维护',
          order: 5,
          tasks: [
            { title: '部署到生产环境', description: '服务器配置与部署', priority: 'high' as PlanTaskPriority },
            { title: '上线验证', description: '生产环境功能验证', priority: 'high' as PlanTaskPriority },
            { title: '收集反馈与迭代', description: '用户反馈收集', priority: 'low' as PlanTaskPriority },
          ],
        },
      ],
      risks: [
        { description: '范围蔓延导致延期', impact: 'high', mitigation: '严格控制 MVP 边界，后续迭代' },
        { description: '技术难点卡住进度', impact: 'medium', mitigation: '尽早验证关键技术，准备备选方案' },
        { description: '上线后无人使用', impact: 'medium', mitigation: '尽早收集用户反馈，快速迭代' },
      ],
      milestones: [
        { name: '需求确认', description: 'MVP 范围与目标确认' },
        { name: '设计完成', description: '技术方案与原型定稿' },
        { name: 'MVP 完成', description: '核心功能开发完成' },
        { name: '成功上线', description: '项目部署上线' },
      ],
      nextActions: [
        '明确项目的核心目标与成功标准',
        '定义 MVP 的最小功能范围',
        '梳理核心用户流程',
      ],
      assumptions: [
        '有基本的开发环境与工具',
        '技术栈已确定或有明确倾向',
        '能保证持续的开发时间投入',
      ],
    };
  }

  private learningTemplate() {
    return {
      phases: [
        {
          name: '基础学习',
          description: '建立知识框架与核心概念',
          order: 1,
          tasks: [
            { title: '确定学习目标与深度', description: '了解 / 能上手 / 精通', priority: 'high' as PlanTaskPriority },
            { title: '收集学习资源', description: '书籍、课程、文档', priority: 'medium' as PlanTaskPriority },
            { title: '建立知识框架', description: '核心概念与知识地图', priority: 'high' as PlanTaskPriority },
          ],
        },
        {
          name: '实践练习',
          description: '通过实践巩固知识',
          order: 2,
          tasks: [
            { title: '完成入门练习', description: '基础实操练习', priority: 'high' as PlanTaskPriority },
            { title: '做一个小项目', description: '综合实践应用', priority: 'high' as PlanTaskPriority },
            { title: '解决实际问题', description: '在真实场景中应用', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '深入掌握',
          description: '深入原理与高级主题',
          order: 3,
          tasks: [
            { title: '深入核心原理', description: '理解底层机制', priority: 'medium' as PlanTaskPriority },
            { title: '学习高级主题', description: '进阶特性与最佳实践', priority: 'medium' as PlanTaskPriority },
            { title: '阅读源码或论文', description: '从源头理解', priority: 'low' as PlanTaskPriority },
          ],
        },
        {
          name: '输出复盘',
          description: '总结输出与知识沉淀',
          order: 4,
          tasks: [
            { title: '写学习笔记或文章', description: '知识整理与输出', priority: 'medium' as PlanTaskPriority },
            { title: '能向他人讲清楚', description: '费曼学习法验证', priority: 'high' as PlanTaskPriority },
            { title: '复盘学习过程', description: '总结方法与改进', priority: 'low' as PlanTaskPriority },
          ],
        },
      ],
      risks: [
        { description: '学习目标不清晰', impact: 'medium', mitigation: '先明确学到什么程度算成功' },
        { description: '中途放弃', impact: 'high', mitigation: '设定里程碑与小目标，保持正反馈' },
        { description: '只学不练', impact: 'medium', mitigation: '每个阶段都安排实践任务' },
      ],
      milestones: [
        { name: '框架建立', description: '知识框架与核心概念掌握' },
        { name: '实践完成', description: '完成至少 1 个实践项目' },
        { name: '深度掌握', description: '理解核心原理' },
        { name: '能教他人', description: '能清晰讲解核心概念' },
      ],
      nextActions: [
        '明确你想学到什么程度',
        '收集 2-3 个优质学习资源',
        '建立知识框架的初版',
      ],
      assumptions: [
        '有基本的学习时间保证',
        '能找到合适的学习资源',
        '有实践应用的机会或场景',
      ],
    };
  }

  private unknownTemplate() {
    return {
      phases: [
        {
          name: '目标拆解',
          description: '把模糊目标拆成可执行的子目标',
          order: 1,
          tasks: [
            { title: '明确目标定义', description: '做到什么程度算成功', priority: 'high' as PlanTaskPriority },
            { title: '拆解子目标', description: '分解为可推进的步骤', priority: 'high' as PlanTaskPriority },
            { title: '确定优先级', description: '哪些先做、哪些后做', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '资源准备',
          description: '梳理所需资源与前置条件',
          order: 2,
          tasks: [
            { title: '梳理所需资源', description: '人力、工具、信息', priority: 'medium' as PlanTaskPriority },
            { title: '确认前置条件', description: '依赖项与阻塞项', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '执行推进',
          description: '按计划执行与跟踪',
          order: 3,
          tasks: [
            { title: '启动核心任务', description: '从最高优先级开始', priority: 'high' as PlanTaskPriority },
            { title: '定期检查进度', description: '按节点复盘', priority: 'medium' as PlanTaskPriority },
          ],
        },
        {
          name: '验收复盘',
          description: '验收成果与总结经验',
          order: 4,
          tasks: [
            { title: '验收成果', description: '对照成功标准检查', priority: 'high' as PlanTaskPriority },
            { title: '复盘总结', description: '经验沉淀与改进', priority: 'low' as PlanTaskPriority },
          ],
        },
      ],
      risks: [
        { description: '目标不够清晰导致方向偏离', impact: 'high', mitigation: '先明确成功标准再开始执行' },
        { description: '资源不足', impact: 'medium', mitigation: '尽早梳理资源需求，寻求支持' },
        { description: '执行过程中失去动力', impact: 'medium', mitigation: '设定小里程碑，保持正反馈' },
      ],
      milestones: [
        { name: '目标明确', description: '成功标准与子目标确认' },
        { name: '资源就绪', description: '所需资源准备完成' },
        { name: '核心完成', description: '核心任务执行完成' },
        { name: '验收通过', description: '成果达到成功标准' },
      ],
      nextActions: [
        '先把目标描述得更具体',
        '明确做到什么程度算成功',
        '拆解出 3-5 个子目标',
      ],
      assumptions: [
        '目标有明确的交付物或成果',
        '有基本的执行条件',
        '能保证一定的推进时间',
      ],
    };
  }

  // ============================================================
  // 个性化辅助
  // ============================================================

  private personalizePhase(
    phase: { name: string; description: string; order: number; tasks: Omit<PlanTask, 'id'>[] },
    goal: { audience: string | null; duration: number | null; shareDate: string | null; timeConstraint: string | null },
  ): PlanPhase {
    return {
      id: randomUUID(),
      name: phase.name,
      description: phase.description,
      order: phase.order,
      tasks: phase.tasks.map((t) => ({ ...t, id: randomUUID() })),
    };
  }

  private personalizeMilestone(
    milestone: { name: string; description: string; targetDate?: string },
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

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiGatewayService } from '../../infrastructure/ai-gateway/ai-gateway.service';
import { PromptRegistryService } from '../prompt-registry/prompt-registry.service';
import {
  ApiError,
  ErrorCode,
  ScenarioTypeEnum,
  SCENARIO_FIELD_HINTS,
  SCENARIO_TYPE_LABELS,
  GoalStageEnum,
} from '@ai-task-manager/shared';
import type { CreateGoalDto } from './dto/create-goal.dto';
import type { UpdateGoalDto } from './dto/update-goal.dto';
import type { DetectScenarioDto } from './dto/detect-scenario.dto';
import type { NormalizeContextDto } from './dto/normalize-context.dto';

/**
 * 场景关键词词典（mock 识别用）
 * 真实模式下由 AiGateway 调用大模型识别
 */
const SCENARIO_KEYWORDS: Record<Exclude<ScenarioTypeEnum, ScenarioTypeEnum.UNKNOWN>, string[]> = {
  [ScenarioTypeEnum.SHARING_PREP]: [
    '分享', '培训', '汇报', '演讲', '讲座', '分享会', 'workshop', 'presentation',
    '宣讲', '路演', 'demo day', '技术分享', '周报', '述职',
  ],
  [ScenarioTypeEnum.COMPETITION]: [
    '比赛', '竞赛', '参赛', 'hackathon', '大赛', '挑战赛', '创新赛', '编程赛',
    'trae', '创造力大赛',
  ],
  [ScenarioTypeEnum.CONTENT_CREATION]: [
    '写文章', '做视频', '内容', '创作', '博客', '公众号', '短视频', '播客',
    '自媒体', '小红书', 'b站', '专栏', '连载',
  ],
  [ScenarioTypeEnum.SMALL_PROJECT]: [
    '项目', '开发', '上线', '产品', 'mvp', '原型', '构建', '搭建',
    '做个 app', '做个网站', 'side project', '副业',
  ],
  [ScenarioTypeEnum.LEARNING]: [
    '学习', '掌握', '入门', '精通', '学懂', '练习', '学会', '复习',
    '备考', '考证', '啃完', '研究',
  ],
};

@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGatewayService,
    private readonly promptRegistry: PromptRegistryService,
  ) {}

  // ============================================================
  // 目标 CRUD
  // ============================================================

  async findAll(userId: string, query: {
    workspaceId: string;
    scenarioType?: string;
    currentStage?: string;
    keyword?: string;
  }) {
    await this.requireMembership(query.workspaceId, userId);

    const where: Record<string, unknown> = {
      workspaceId: query.workspaceId,
      deletedAt: null,
    };
    if (query.scenarioType) {
      where.scenarioType = query.scenarioType;
    }
    if (query.currentStage) {
      where.currentStage = query.currentStage;
    }
    if (query.keyword) {
      where.OR = [
        { topic: { contains: query.keyword } },
        { title: { contains: query.keyword } },
      ];
    }

    const goals = await this.prisma.goal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((g) => this.toGoalResponse(g));
  }

  async findOne(id: string, userId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!goal) {
      throw new ApiError(ErrorCode.GOAL_NOT_FOUND);
    }

    await this.requireMembership(goal.workspaceId, userId);
    return this.toGoalResponse(goal);
  }

  async create(dto: CreateGoalDto, userId: string) {
    await this.requireMembership(dto.workspaceId, userId);

    const goal = await this.prisma.goal.create({
      data: {
        workspaceId: dto.workspaceId,
        creatorId: userId,
        topic: dto.topic,
        title: dto.title ?? null,
        scenarioType: dto.scenarioType ?? null,
        audience: dto.audience ?? null,
        duration: dto.duration ?? null,
        shareDate: dto.shareDate ? new Date(dto.shareDate) : null,
        goalType: dto.goalType ?? null,
        preparedness: dto.preparedness ?? null,
        timeConstraint: dto.timeConstraint ?? null,
        resourceConstraint: dto.resourceConstraint ?? null,
        priority: dto.priority ?? null,
        successCriteria: dto.successCriteria ?? null,
        currentStage: dto.currentStage ?? GoalStageEnum.INSPIRATION,
        isCollaborative: dto.isCollaborative ?? false,
        sceneTags: dto.sceneTags ?? null,
      },
    });

    this.logger.log(`目标已创建: ${goal.id} (workspace=${dto.workspaceId}, creator=${userId})`);
    return this.toGoalResponse(goal);
  }

  async update(id: string, dto: UpdateGoalDto, userId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!goal) {
      throw new ApiError(ErrorCode.GOAL_NOT_FOUND);
    }

    await this.requireMembership(goal.workspaceId, userId);

    const data: Record<string, unknown> = {};
    if (dto.topic !== undefined) data.topic = dto.topic;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.scenarioType !== undefined) data.scenarioType = dto.scenarioType;
    if (dto.audience !== undefined) data.audience = dto.audience;
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.shareDate !== undefined) data.shareDate = dto.shareDate ? new Date(dto.shareDate) : null;
    if (dto.goalType !== undefined) data.goalType = dto.goalType;
    if (dto.preparedness !== undefined) data.preparedness = dto.preparedness;
    if (dto.timeConstraint !== undefined) data.timeConstraint = dto.timeConstraint;
    if (dto.resourceConstraint !== undefined) data.resourceConstraint = dto.resourceConstraint;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.successCriteria !== undefined) data.successCriteria = dto.successCriteria;
    if (dto.currentStage !== undefined) data.currentStage = dto.currentStage;
    if (dto.isCollaborative !== undefined) data.isCollaborative = dto.isCollaborative;
    if (dto.sceneTags !== undefined) data.sceneTags = dto.sceneTags;

    const updated = await this.prisma.goal.update({
      where: { id },
      data,
    });

    return this.toGoalResponse(updated);
  }

  async remove(id: string, userId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!goal) {
      throw new ApiError(ErrorCode.GOAL_NOT_FOUND);
    }

    await this.requireMembership(goal.workspaceId, userId);

    // 软删除
    await this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // ============================================================
  // 场景识别（AI / mock）
  // ============================================================

  async detectScenario(dto: DetectScenarioDto) {
    // 从 Prompt Registry 解析提示词（找不到则回退到内联）
    const rendered = await this.promptRegistry.renderForCall('goal.detect_scenario', { topic: dto.topic });
    const messages = rendered?.messages ?? [
      { role: 'system', content: '你是目标场景识别助手，负责把用户的模糊目标归类到预设场景。' },
      { role: 'user', content: `目标：${dto.topic}` },
    ];
    // 调用 AI 网关（mock 模式下仅记录日志，实际识别用本地关键词匹配）
    const aiResult = await this.aiGateway.chat({
      promptName: 'goal.detect_scenario',
      messages,
    });
    this.logger.debug(`场景识别 AI 调用: ${aiResult.durationMs}ms`);

    // 本地关键词匹配（mock 阶段的主力识别逻辑）
    const detections = this.matchScenarios(dto.topic);

    // 补充 hints 辅助
    const primaryScenario = detections[0]?.scenarioType ?? ScenarioTypeEnum.UNKNOWN;
    const suggestedTitle = this.generateTitle(dto.topic, primaryScenario);
    const followUpQuestions = this.generateFollowUpQuestions(primaryScenario, dto);
    const suggestedSuccessCriteria = this.generateSuccessCriteria(primaryScenario, dto.topic);

    return {
      topic: dto.topic,
      detections,
      primaryScenario,
      suggestedTitle,
      followUpQuestions,
      suggestedSuccessCriteria,
    };
  }

  // ============================================================
  // 结构化补全
  // ============================================================

  async normalizeContext(dto: NormalizeContextDto) {
    const fields = dto.fields;
    const scenarioType = dto.scenarioType;

    // 根据场景确定关键字段
    const requiredFields = SCENARIO_FIELD_HINTS[scenarioType] ?? [];
    const providedKeys = Object.entries(fields)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k]) => k);

    const missingFields = requiredFields.filter((f) => !providedKeys.includes(f));
    const readyForPlanning = missingFields.length === 0 && !!fields.successCriteria;

    const suggestions: string[] = [];
    if (missingFields.length > 0) {
      suggestions.push(`建议补全：${missingFields.join('、')}`);
    }
    if (!fields.successCriteria) {
      suggestions.push('成功标准是进入规划阶段的关键，建议明确"做到什么程度算成功"');
    }
    if (!fields.timeConstraint && !fields.duration && !fields.shareDate) {
      suggestions.push('缺少时间约束，规划引擎难以安排节奏，建议补充');
    }

    return {
      normalized: fields,
      missingFields,
      readyForPlanning,
      suggestions,
    };
  }

  // ============================================================
  // 私有辅助
  // ============================================================

  /**
   * 基于关键词匹配场景（mock 识别）
   */
  private matchScenarios(topic: string): Array<{
    scenarioType: ScenarioTypeEnum;
    confidence: number;
    reason: string;
    suggestedFields: string[];
  }> {
    const lowerTopic = topic.toLowerCase();
    const scores: Array<{ type: ScenarioTypeEnum; hits: string[] }> = [];

    for (const [type, keywords] of Object.entries(SCENARIO_KEYWORDS)) {
      const hits = keywords.filter((k) => lowerTopic.includes(k.toLowerCase()));
      if (hits.length > 0) {
        scores.push({ type: type as ScenarioTypeEnum, hits });
      }
    }

    if (scores.length === 0) {
      return [{
        scenarioType: ScenarioTypeEnum.UNKNOWN,
        confidence: 0.3,
        reason: '未匹配到明确场景关键词，建议手动选择场景或补充描述',
        suggestedFields: SCENARIO_FIELD_HINTS[ScenarioTypeEnum.UNKNOWN],
      }];
    }

    // 按命中数排序，计算置信度
    const maxHits = Math.max(...scores.map((s) => s.hits.length));
    return scores
      .map((s) => ({
        scenarioType: s.type,
        confidence: Math.min(0.95, 0.5 + (s.hits.length / maxHits) * 0.4 + s.hits.length * 0.05),
        reason: `命中关键词：${s.hits.join('、')}`,
        suggestedFields: SCENARIO_FIELD_HINTS[s.type],
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  private generateTitle(topic: string, scenario: ScenarioTypeEnum): string {
    // 截取前 24 字作为标题建议
    const base = topic.length > 24 ? topic.slice(0, 24) + '…' : topic;
    const prefix = SCENARIO_TYPE_LABELS[scenario].split(' ')[0];
    return `[${prefix}] ${base}`;
  }

  private generateFollowUpQuestions(scenario: ScenarioTypeEnum, dto: DetectScenarioDto): string[] {
    const questions: string[] = [];
    const hints = dto.hints;

    if (!hints?.audience) {
      questions.push('这次的目标受众是谁？');
    }
    if (scenario === ScenarioTypeEnum.SHARING_PREP) {
      questions.push('分享的时长大概是多久？');
      questions.push('有没有确定的分享日期？');
    }
    if (scenario === ScenarioTypeEnum.COMPETITION || scenario === ScenarioTypeEnum.SMALL_PROJECT) {
      questions.push('有没有明确的时间节点或截止日期？');
      questions.push('是独立完成还是团队协作？');
    }
    if (scenario === ScenarioTypeEnum.CONTENT_CREATION) {
      questions.push('想发布到哪个平台？');
      questions.push('期望的内容形式是什么（图文/视频/音频）？');
    }
    if (scenario === ScenarioTypeEnum.LEARNING) {
      questions.push('希望学到什么程度（了解/能上手/精通）？');
    }
    questions.push('做到什么程度算成功？');
    return questions;
  }

  private generateSuccessCriteria(scenario: ScenarioTypeEnum, topic: string): string[] {
    const criteria: string[] = [];
    switch (scenario) {
      case ScenarioTypeEnum.SHARING_PREP:
        criteria.push('完成分享内容大纲与全部素材');
        criteria.push('完成至少 1 次试讲并收集反馈');
        criteria.push('分享当天顺利交付，听众反馈正向');
        break;
      case ScenarioTypeEnum.COMPETITION:
        criteria.push('完成参赛作品/项目并提交');
        criteria.push('通过初赛进入下一轮');
        criteria.push('完成答辩/演示材料');
        break;
      case ScenarioTypeEnum.CONTENT_CREATION:
        criteria.push('完成首批内容发布');
        criteria.push('内容质量达到可发布标准');
        criteria.push('建立可持续的更新节奏');
        break;
      case ScenarioTypeEnum.SMALL_PROJECT:
        criteria.push('MVP 版本可运行');
        criteria.push('核心流程跑通');
        criteria.push('完成上线或交付');
        break;
      case ScenarioTypeEnum.LEARNING:
        criteria.push('完成核心知识点的学习');
        criteria.push('能独立完成 1 个实践练习');
        criteria.push('能向他人讲清楚核心概念');
        break;
      default:
        criteria.push('明确目标交付物');
        criteria.push('完成核心里程碑');
        break;
    }
    return criteria;
  }

  /**
   * 检查用户是否为工作区成员，非成员抛 403
   */
  private async requireMembership(workspaceId: string, userId: string): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: '你不是该工作区的成员',
      });
    }
  }

  private toGoalResponse(goal: {
    id: string;
    workspaceId: string;
    creatorId: string;
    topic: string;
    title: string | null;
    scenarioType: string | null;
    audience: string | null;
    duration: number | null;
    shareDate: Date | null;
    goalType: string | null;
    preparedness: string | null;
    timeConstraint: string | null;
    resourceConstraint: string | null;
    priority: string | null;
    successCriteria: string | null;
    currentStage: string;
    isCollaborative: boolean;
    sceneTags: string | null;
    scenarioSnapshot: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: goal.id,
      workspaceId: goal.workspaceId,
      creatorId: goal.creatorId,
      topic: goal.topic,
      title: goal.title,
      scenarioType: goal.scenarioType,
      audience: goal.audience,
      duration: goal.duration,
      shareDate: goal.shareDate?.toISOString() ?? null,
      goalType: goal.goalType,
      preparedness: goal.preparedness,
      timeConstraint: goal.timeConstraint,
      resourceConstraint: goal.resourceConstraint,
      priority: goal.priority,
      successCriteria: goal.successCriteria,
      currentStage: goal.currentStage,
      isCollaborative: goal.isCollaborative,
      sceneTags: goal.sceneTags,
      scenarioSnapshot: goal.scenarioSnapshot,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}

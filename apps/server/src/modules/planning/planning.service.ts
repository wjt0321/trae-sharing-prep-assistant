import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiGatewayService } from '../../infrastructure/ai-gateway/ai-gateway.service';
import { PromptRegistryService } from '../prompt-registry/prompt-registry.service';
import { PlanEngine } from './plan-engine';
import { CollaborationService } from '../collaboration/collaboration.service';
import { NotificationService } from '../notification/notification.service';
import { GoalPermissionService } from '../goal/goal-permission.service';
import {
  ApiError,
  ErrorCode,
  ActivityEventTypeEnum,
  type PlanContent,
  type PlanResponseDto,
  type PlanCompareResponseDto,
} from '@ai-task-manager/shared';
import type { GeneratePlanDto } from './dto/generate-plan.dto';
import type { ReplanDto } from './dto/replan.dto';

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AiGatewayService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly planEngine: PlanEngine,
    private readonly collaborationService: CollaborationService,
    private readonly notificationService: NotificationService,
    private readonly goalPermissionService: GoalPermissionService,
  ) {}

  // ============================================================
  // 查询
  // ============================================================

  async findAll(goalId: string, userId: string): Promise<PlanResponseDto[]> {
    const goal = await this.goalPermissionService.getGoalWithMembershipCheck(goalId, userId);
    const plans = await this.prisma.plan.findMany({
      where: { goalId: goal.id },
      orderBy: { version: 'desc' },
    });
    return plans.map((p) => this.toPlanResponse(p));
  }

  async findOne(id: string, userId: string): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: '规划不存在' });
    }
    await this.goalPermissionService.getGoalWithMembershipCheck(plan.goalId, userId);
    return this.toPlanResponse(plan);
  }

  async findActive(goalId: string, userId: string): Promise<PlanResponseDto | null> {
    const goal = await this.goalPermissionService.getGoalWithMembershipCheck(goalId, userId);
    const plan = await this.prisma.plan.findFirst({
      where: { goalId: goal.id, isActive: true },
      orderBy: { version: 'desc' },
    });
    return plan ? this.toPlanResponse(plan) : null;
  }

  // ============================================================
  // 首版规划生成
  // ============================================================

  async create(goalId: string, dto: GeneratePlanDto, userId: string): Promise<PlanResponseDto> {
    const goal = await this.goalPermissionService.getGoalWithMembershipCheck(goalId, userId);

    // 检查是否已有活跃版本
    if (!dto.force) {
      const existing = await this.prisma.plan.findFirst({
        where: { goalId: goal.id, isActive: true },
      });
      if (existing) {
        throw new ApiError(ErrorCode.CONFLICT, {
          message: '该目标已有规划，如需重新生成请使用重规划或 force=true',
        });
      }
    }

    // 从 Prompt Registry 解析提示词（找不到则回退到内联）
    const rendered = await this.promptRegistry.renderForCall('plan.generate', {
      topic: goal.topic,
      scenarioType: goal.scenarioType ?? 'unknown',
    });
    const messages = rendered?.messages ?? [
      { role: 'system', content: '你是规划引擎，负责把目标拆解为结构化的阶段、任务、风险与里程碑。' },
      { role: 'user', content: `目标：${goal.topic}\n场景：${goal.scenarioType ?? 'unknown'}` },
    ];
    // 调用 AI 网关（mock 模式下仅记录日志）
    const aiResult = await this.aiGateway.chat({
      promptName: 'plan.generate',
      messages,
    });
    this.logger.debug(`规划 AI 调用: ${aiResult.durationMs}ms`);

    // 规则引擎生成规划（fallback + 主力）
    const content = this.planEngine.generatePlan(this.toEngineGoal(goal));
    const contentJson = JSON.stringify(content);

    // 计算版本号
    const maxVersion = await this.prisma.plan.aggregate({
      where: { goalId: goal.id },
      _max: { version: true },
    });
    const newVersion = (maxVersion._max.version ?? 0) + 1;

    // 如果是 force 重新生成，先把旧版本设为非活跃
    if (dto.force) {
      await this.prisma.plan.updateMany({
        where: { goalId: goal.id, isActive: true },
        data: { isActive: false },
      });
    }

    const plan = await this.prisma.plan.create({
      data: {
        goalId: goal.id,
        version: newVersion,
        isActive: true,
        content: contentJson,
        source: 'rule_engine',
        changeReason: null,
        aiPromptLog: `AI 调用耗时 ${aiResult.durationMs}ms，规则引擎生成结构化规划`,
      },
    });

    // 更新目标阶段为"规划中"
    await this.prisma.goal.update({
      where: { id: goal.id },
      data: { currentStage: 'planning' },
    });

    // 记录活动流
    await this.collaborationService.recordActivity({
      goalId: goal.id,
      actorId: userId,
      type: ActivityEventTypeEnum.PLAN_CREATED,
      targetType: 'plan',
      targetId: plan.id,
      targetTitle: `规划 v${newVersion}`,
    });

    this.logger.log(`首版规划已生成: goalId=${goal.id}, version=${newVersion}`);
    return this.toPlanResponse(plan);
  }

  // ============================================================
  // 重规划
  // ============================================================

  async replan(goalId: string, dto: ReplanDto, userId: string): Promise<PlanResponseDto> {
    const goal = await this.goalPermissionService.getGoalWithMembershipCheck(goalId, userId);

    // 获取当前活跃版本
    const currentPlan = await this.prisma.plan.findFirst({
      where: { goalId: goal.id, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (!currentPlan) {
      throw new ApiError(ErrorCode.NOT_FOUND, {
        message: '尚无规划版本，请先生成首版规划',
      });
    }

    const currentContent = JSON.parse(currentPlan.content) as PlanContent;

    // 如果有约束变化，更新目标
    if (dto.constraintChanges) {
      const updateData: Record<string, unknown> = {};
      if (dto.constraintChanges.timeConstraint !== undefined) {
        updateData.timeConstraint = dto.constraintChanges.timeConstraint;
      }
      if (dto.constraintChanges.resourceConstraint !== undefined) {
        updateData.resourceConstraint = dto.constraintChanges.resourceConstraint;
      }
      if (dto.constraintChanges.successCriteria !== undefined) {
        updateData.successCriteria = dto.constraintChanges.successCriteria;
      }
      if (Object.keys(updateData).length > 0) {
        await this.prisma.goal.update({
          where: { id: goal.id },
          data: updateData,
        });
      }
    }

    // 重新读取目标（可能已更新约束）
    const updatedGoal = await this.prisma.goal.findUnique({ where: { id: goal.id } });
    if (!updatedGoal) {
      throw new ApiError(ErrorCode.GOAL_NOT_FOUND);
    }

    // 从 Prompt Registry 解析提示词（找不到则回退到内联）
    const rendered = await this.promptRegistry.renderForCall('plan.replan', {
      reason: dto.reason,
      topic: updatedGoal.topic,
    });
    const messages = rendered?.messages ?? [
      { role: 'system', content: '你是重规划引擎，根据约束变化重新生成规划。' },
      { role: 'user', content: `重规划原因：${dto.reason}\n目标：${updatedGoal.topic}` },
    ];
    // 调用 AI 网关记录
    const aiResult = await this.aiGateway.chat({
      promptName: 'plan.replan',
      messages,
    });

    // 规则引擎重规划
    const newContent = this.planEngine.replan(
      currentContent,
      this.toEngineGoal(updatedGoal),
      dto.reason,
      dto.constraintChanges,
    );

    // 旧版本设为非活跃
    await this.prisma.plan.update({
      where: { id: currentPlan.id },
      data: { isActive: false },
    });

    // 创建新版本
    const newVersion = currentPlan.version + 1;
    const plan = await this.prisma.plan.create({
      data: {
        goalId: goal.id,
        version: newVersion,
        isActive: true,
        content: JSON.stringify(newContent),
        source: 'rule_engine',
        changeReason: dto.reason,
        aiPromptLog: `[重规划：${dto.reason}] AI 调用耗时 ${aiResult.durationMs}ms`,
      },
    });

    // 记录活动流
    await this.collaborationService.recordActivity({
      goalId: goal.id,
      actorId: userId,
      type: ActivityEventTypeEnum.PLAN_REPLANNED,
      targetType: 'plan',
      targetId: plan.id,
      targetTitle: `规划 v${newVersion}`,
      detail: dto.reason,
    });

    // 通知工作区其他成员
    await this.notificationService.notifyPlanReplanned({
      actorId: userId,
      workspaceId: goal.workspaceId,
      goalId: goal.id,
      goalTitle: goal.title ?? goal.topic,
      reason: dto.reason,
      planId: plan.id,
    });

    this.logger.log(`重规划完成: goalId=${goal.id}, version=${currentPlan.version} → ${newVersion}`);
    return this.toPlanResponse(plan);
  }

  // ============================================================
  // 方案比较
  // ============================================================

  async compare(
    goalId: string,
    versionA: number,
    versionB: number,
    userId: string,
  ): Promise<PlanCompareResponseDto> {
    const goal = await this.goalPermissionService.getGoalWithMembershipCheck(goalId, userId);

    const [planA, planB] = await Promise.all([
      this.prisma.plan.findFirst({
        where: { goalId: goal.id, version: versionA },
      }),
      this.prisma.plan.findFirst({
        where: { goalId: goal.id, version: versionB },
      }),
    ]);

    if (!planA || !planB) {
      throw new ApiError(ErrorCode.NOT_FOUND, {
        message: '指定的规划版本不存在',
      });
    }

    const contentA = JSON.parse(planA.content) as PlanContent;
    const contentB = JSON.parse(planB.content) as PlanContent;

    const result = this.planEngine.compare(contentA, contentB);

    return {
      versionA: { version: planA.version, createdAt: planA.createdAt.toISOString() },
      versionB: { version: planB.version, createdAt: planB.createdAt.toISOString() },
      diffs: result.diffs,
      summary: result.summary,
    };
  }

  // ============================================================
  // 切换活跃版本
  // ============================================================

  async setActive(goalId: string, version: number, userId: string): Promise<PlanResponseDto> {
    const goal = await this.goalPermissionService.getGoalWithMembershipCheck(goalId, userId);

    const targetPlan = await this.prisma.plan.findFirst({
      where: { goalId: goal.id, version },
    });
    if (!targetPlan) {
      throw new ApiError(ErrorCode.NOT_FOUND, {
        message: `版本 ${version} 不存在`,
      });
    }

    // 取消其他版本的活跃状态
    await this.prisma.plan.updateMany({
      where: { goalId: goal.id, isActive: true },
      data: { isActive: false },
    });

    // 设目标版本为活跃
    const plan = await this.prisma.plan.update({
      where: { id: targetPlan.id },
      data: { isActive: true },
    });

    // 记录活动流
    await this.collaborationService.recordActivity({
      goalId: goal.id,
      actorId: userId,
      type: ActivityEventTypeEnum.PLAN_ACTIVATED,
      targetType: 'plan',
      targetId: plan.id,
      targetTitle: `规划 v${version}`,
    });

    this.logger.log(`切换活跃版本: goalId=${goal.id}, version=${version}`);
    return this.toPlanResponse(plan);
  }

  // ============================================================
  // 私有辅助
  // ============================================================

  /**
   * 把 Prisma Goal 转换为 PlanEngine 需要的格式（shareDate: Date → string）
   */
  private toEngineGoal(goal: {
    topic: string;
    title: string | null;
    scenarioType: string | null;
    audience: string | null;
    duration: number | null;
    shareDate: Date | null;
    timeConstraint: string | null;
    resourceConstraint: string | null;
    successCriteria: string | null;
    isCollaborative: boolean;
  }) {
    return {
      topic: goal.topic,
      title: goal.title,
      scenarioType: goal.scenarioType,
      audience: goal.audience,
      duration: goal.duration,
      shareDate: goal.shareDate ? goal.shareDate.toISOString() : null,
      timeConstraint: goal.timeConstraint,
      resourceConstraint: goal.resourceConstraint,
      successCriteria: goal.successCriteria,
      isCollaborative: goal.isCollaborative,
    };
  }

  private toPlanResponse(plan: {
    id: string;
    goalId: string;
    version: number;
    isActive: boolean;
    content: string;
    source: string;
    changeReason: string | null;
    aiPromptLog: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PlanResponseDto {
    return {
      id: plan.id,
      goalId: plan.goalId,
      version: plan.version,
      isActive: plan.isActive,
      content: JSON.parse(plan.content) as PlanContent,
      source: plan.source as 'rule_engine' | 'ai' | 'hybrid',
      changeReason: plan.changeReason,
      replanReason: plan.changeReason,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }
}

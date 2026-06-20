/**
 * 目标 DTO
 * 参考：03_目标创建器与场景识别实施清单.md
 *
 * 设计原则：
 * - topic 保留为"原始目标文本"（用户一句话输入）
 * - title 为结构化标题（AI 生成或用户编辑）
 * - 支持从模糊目标到结构化上下文的渐进式补全
 */
import type {
  GoalTypeEnum,
  ScenarioTypeEnum,
  GoalPriorityEnum,
  GoalStageEnum,
} from '../enums/index.js';

/** 创建目标请求 */
export interface CreateGoalRequestDto {
  /** 原始目标文本（用户一句话输入，低门槛入口） */
  topic: string;
  /** 结构化标题（可空，由 AI 生成或用户后续编辑） */
  title?: string;
  /** 所属工作区 ID */
  workspaceId: string;
  /** 场景类型（可空，由 detect-scenario 接口识别后回填） */
  scenarioType?: ScenarioTypeEnum;
  /** 听众对象 */
  audience?: string;
  /** 分享时长（分钟） */
  duration?: number;
  /** 分享日期（ISO 8601 date） */
  shareDate?: string;
  /** 分享目标 */
  goalType?: GoalTypeEnum;
  /** 当前准备状态 */
  preparedness?: string;
  /** 时间约束（自然语言，如"两周内"、"下个月底前"） */
  timeConstraint?: string;
  /** 资源约束（自然语言，如"独立完成"、"有 2 位协作"） */
  resourceConstraint?: string;
  /** 优先级 */
  priority?: GoalPriorityEnum;
  /** 成功标准（自然语言描述） */
  successCriteria?: string;
  /** 当前阶段 */
  currentStage?: GoalStageEnum;
  /** 是否多人协作 */
  isCollaborative?: boolean;
  /** 场景标签（逗号分隔） */
  sceneTags?: string;
}

/** 目标响应 */
export interface GoalResponseDto {
  id: string;
  workspaceId: string;
  creatorId: string;
  /** 原始目标文本 */
  topic: string;
  /** 结构化标题 */
  title: string | null;
  /** 场景类型 */
  scenarioType: ScenarioTypeEnum | null;
  audience: string | null;
  duration: number | null;
  shareDate: string | null;
  goalType: GoalTypeEnum | null;
  preparedness: string | null;
  timeConstraint: string | null;
  resourceConstraint: string | null;
  priority: GoalPriorityEnum | null;
  successCriteria: string | null;
  currentStage: GoalStageEnum;
  isCollaborative: boolean;
  sceneTags: string | null;
  /** 场景识别快照（JSON 字符串，存储 AI 识别的完整结果，用于审计） */
  scenarioSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 更新目标请求 */
export interface UpdateGoalRequestDto {
  topic?: string;
  title?: string;
  scenarioType?: ScenarioTypeEnum;
  audience?: string;
  duration?: number;
  shareDate?: string;
  goalType?: GoalTypeEnum;
  preparedness?: string;
  timeConstraint?: string;
  resourceConstraint?: string;
  priority?: GoalPriorityEnum;
  successCriteria?: string;
  currentStage?: GoalStageEnum;
  isCollaborative?: boolean;
  sceneTags?: string;
}

/** 场景识别请求 */
export interface DetectScenarioRequestDto {
  /** 原始目标文本 */
  topic: string;
  /** 已知的上下文信息（可选，辅助识别） */
  hints?: {
    audience?: string;
    timeConstraint?: string;
  };
}

/** 场景识别结果项 */
export interface ScenarioDetectionItem {
  scenarioType: ScenarioTypeEnum;
  /** 置信度 0-1 */
  confidence: number;
  /** 识别理由 */
  reason: string;
  /** 推荐补全的字段 */
  suggestedFields: string[];
}

/** 场景识别响应 */
export interface DetectScenarioResponseDto {
  /** 原始输入 */
  topic: string;
  /** 识别结果列表（按置信度降序） */
  detections: ScenarioDetectionItem[];
  /** 推荐的主场景（置信度最高） */
  primaryScenario: ScenarioTypeEnum;
  /** AI 生成的结构化标题建议 */
  suggestedTitle: string;
  /** 缺失关键信息追问建议 */
  followUpQuestions: string[];
  /** 成功标准初稿建议 */
  suggestedSuccessCriteria: string[];
}

/** 结构化补全请求 */
export interface NormalizeContextRequestDto {
  /** 原始目标文本 */
  topic: string;
  /** 已识别的场景类型 */
  scenarioType: ScenarioTypeEnum;
  /** 用户补全的字段 */
  fields: {
    audience?: string;
    duration?: number;
    shareDate?: string;
    goalType?: GoalTypeEnum;
    preparedness?: string;
    timeConstraint?: string;
    resourceConstraint?: string;
    priority?: GoalPriorityEnum;
    successCriteria?: string;
    isCollaborative?: boolean;
  };
}

/** 结构化补全响应 */
export interface NormalizeContextResponseDto {
  /** 规范化后的字段（去噪、统一格式） */
  normalized: NormalizeContextRequestDto['fields'];
  /** 仍缺失的关键字段 */
  missingFields: string[];
  /** 是否可进入规划阶段 */
  readyForPlanning: boolean;
  /** 补全建议 */
  suggestions: string[];
}

/** 目标列表查询参数 */
export interface GoalListQueryDto {
  workspaceId: string;
  scenarioType?: ScenarioTypeEnum;
  currentStage?: GoalStageEnum;
  keyword?: string;
}

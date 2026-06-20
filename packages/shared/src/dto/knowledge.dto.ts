/**
 * 模板库与知识库 DTO
 * 参考：06_模板库知识库与资产沉淀实施清单.md
 *
 * 覆盖：
 * - 模板分类与内容预设
 * - 知识资产类型与标签
 * - 从目标创建模板 / 从模板创建目标
 * - 从导出沉淀为知识资产
 * - 标签检索
 */
import type { ScenarioTypeEnum, GoalPriorityEnum } from '../enums/index.js';

// ============================================================
// 枚举
// ============================================================

/** 模板分类 */
export enum TemplateCategoryEnum {
  /** 场景模板：按场景预设的目标结构 */
  SCENARIO = 'scenario',
  /** 个人模板：用户从历史目标沉淀 */
  PERSONAL = 'personal',
  /** 团队模板：工作区内共享 */
  TEAM = 'team',
  /** 官方推荐模板：系统内置 */
  OFFICIAL = 'official',
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategoryEnum, string> = {
  [TemplateCategoryEnum.SCENARIO]: '场景模板',
  [TemplateCategoryEnum.PERSONAL]: '个人模板',
  [TemplateCategoryEnum.TEAM]: '团队模板',
  [TemplateCategoryEnum.OFFICIAL]: '官方推荐',
};

export const TEMPLATE_CATEGORY_DESCRIPTIONS: Record<TemplateCategoryEnum, string> = {
  [TemplateCategoryEnum.SCENARIO]: '按场景预设的目标结构，新建目标时快速套用',
  [TemplateCategoryEnum.PERSONAL]: '从你的历史目标沉淀，可跨工作区复用',
  [TemplateCategoryEnum.TEAM]: '工作区内共享的团队模板',
  [TemplateCategoryEnum.OFFICIAL]: '系统内置的推荐模板，覆盖常见场景',
};

/** 知识资产类型 */
export enum KnowledgeAssetTypeEnum {
  /** 知识片段：可复用的经验、方法、要点 */
  ASSET = 'asset',
  /** 洞察：从执行中提炼的反思 */
  INSIGHT = 'insight',
  /** 检查清单：可复用的清单 */
  CHECKLIST = 'checklist',
  /** 案例：完整的目标案例（含上下文与结果） */
  CASE = 'case',
}

export const KNOWLEDGE_ASSET_TYPE_LABELS: Record<KnowledgeAssetTypeEnum, string> = {
  [KnowledgeAssetTypeEnum.ASSET]: '知识片段',
  [KnowledgeAssetTypeEnum.INSIGHT]: '洞察',
  [KnowledgeAssetTypeEnum.CHECKLIST]: '检查清单',
  [KnowledgeAssetTypeEnum.CASE]: '案例',
};

export const KNOWLEDGE_ASSET_TYPE_DESCRIPTIONS: Record<KnowledgeAssetTypeEnum, string> = {
  [KnowledgeAssetTypeEnum.ASSET]: '可复用的经验、方法、要点',
  [KnowledgeAssetTypeEnum.INSIGHT]: '从执行中提炼的反思与启发',
  [KnowledgeAssetTypeEnum.CHECKLIST]: '可复用的清单，避免遗漏关键步骤',
  [KnowledgeAssetTypeEnum.CASE]: '完整的目标案例，含上下文与结果',
};

// ============================================================
// 模板内容结构（JSON 字符串存储）
// ============================================================

/**
 * 模板预设的目标字段
 * 用于"从模板创建目标"时预填表单
 */
export interface TemplateContentDto {
  /** 预设 topic */
  topic?: string;
  /** 预设标题 */
  title?: string;
  /** 预设场景类型 */
  scenarioType?: ScenarioTypeEnum;
  /** 预设听众 */
  audience?: string;
  /** 预设时长（分钟） */
  duration?: number;
  /** 预设分享日期 */
  shareDate?: string;
  /** 预设时间约束 */
  timeConstraint?: string;
  /** 预设资源约束 */
  resourceConstraint?: string;
  /** 预设优先级 */
  priority?: GoalPriorityEnum;
  /** 预设成功标准 */
  successCriteria?: string;
  /** 预设是否多人协作 */
  isCollaborative?: boolean;
  /** 预设场景标签 */
  sceneTags?: string;
  /** 预设阶段计划要点（用于规划阶段参考） */
  planHints?: string[];
  /** 预设常见风险（用于规划阶段参考） */
  riskHints?: string[];
  /** 预设检查清单（用于执行阶段参考） */
  checklist?: string[];
  /** 模板说明（前端展示用） */
  description?: string;
}

// ============================================================
// 模板 DTO
// ============================================================

/** 创建模板请求 */
export interface CreateTemplateRequestDto {
  name: string;
  description?: string;
  category: TemplateCategoryEnum;
  /** 关联场景类型（场景模板必填） */
  scenarioType?: ScenarioTypeEnum;
  content: TemplateContentDto;
  /** 是否内置（仅系统调用） */
  isBuiltIn?: boolean;
}

/** 更新模板请求 */
export interface UpdateTemplateRequestDto {
  name?: string;
  description?: string;
  category?: TemplateCategoryEnum;
  scenarioType?: ScenarioTypeEnum;
  content?: TemplateContentDto;
}

/** 从目标创建模板请求 */
export interface CreateTemplateFromGoalRequestDto {
  /** 模板名称（默认用目标标题） */
  name?: string;
  /** 模板描述 */
  description?: string;
  /** 模板分类（默认 personal） */
  category?: TemplateCategoryEnum;
}

/** 模板响应 */
export interface TemplateResponseDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  category: TemplateCategoryEnum;
  scenarioType: ScenarioTypeEnum | null;
  /** 模板内容（已解析为对象） */
  content: TemplateContentDto;
  isBuiltIn: boolean;
  usageCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 模板列表项（精简，不含 content） */
export interface TemplateListItemDto {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategoryEnum;
  scenarioType: ScenarioTypeEnum | null;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 模板列表查询参数 */
export interface TemplateListQueryDto {
  workspaceId: string;
  category?: TemplateCategoryEnum;
  scenarioType?: ScenarioTypeEnum;
  keyword?: string;
  /** 是否仅内置 */
  builtInOnly?: boolean;
}

// ============================================================
// 知识资产 DTO
// ============================================================

/** 创建知识资产请求 */
export interface CreateAssetRequestDto {
  title: string;
  type: KnowledgeAssetTypeEnum;
  content: string;
  /** 标签（逗号分隔） */
  tags?: string;
  /** 来源目标 ID */
  sourceGoalId?: string;
}

/** 更新知识资产请求 */
export interface UpdateAssetRequestDto {
  title?: string;
  type?: KnowledgeAssetTypeEnum;
  content?: string;
  tags?: string;
}

/** 从导出沉淀为知识资产请求 */
export interface CreateAssetFromExportRequestDto {
  /** 资产标题（默认用导出标题） */
  title?: string;
  /** 资产类型（默认 case） */
  type?: KnowledgeAssetTypeEnum;
  /** 标签 */
  tags?: string;
}

/** 知识资产响应 */
export interface KnowledgeAssetResponseDto {
  id: string;
  workspaceId: string;
  title: string;
  type: KnowledgeAssetTypeEnum;
  content: string;
  tags: string | null;
  /** 标签数组（已拆分） */
  tagList: string[];
  sourceGoalId: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 知识资产列表项（精简，content 截断） */
export interface KnowledgeAssetListItemDto {
  id: string;
  title: string;
  type: KnowledgeAssetTypeEnum;
  tags: string | null;
  tagList: string[];
  sourceGoalId: string | null;
  /** 内容摘要（前 120 字） */
  summary: string;
  createdAt: string;
  updatedAt: string;
}

/** 知识资产列表查询参数 */
export interface AssetListQueryDto {
  workspaceId: string;
  type?: KnowledgeAssetTypeEnum;
  /** 关键词（标题 + 内容模糊匹配） */
  keyword?: string;
  /** 标签（逗号分隔，多标签为 OR 关系） */
  tags?: string;
}

// ============================================================
// 从模板创建目标（前端预填表单用）
// ============================================================

/** 从模板创建目标响应（前端拿到后预填表单） */
export interface CreateGoalFromTemplateResponseDto {
  template: TemplateResponseDto;
  /** 预填的目标字段（前端直接灌入表单） */
  prefilledFields: {
    topic?: string;
    title?: string;
    scenarioType?: ScenarioTypeEnum;
    audience?: string;
    duration?: number;
    shareDate?: string;
    timeConstraint?: string;
    resourceConstraint?: string;
    priority?: GoalPriorityEnum;
    successCriteria?: string;
    isCollaborative?: boolean;
    sceneTags?: string;
  };
  /** 规划阶段参考要点 */
  planHints?: string[];
  /** 常见风险提示 */
  riskHints?: string[];
  /** 执行阶段检查清单 */
  checklist?: string[];
}

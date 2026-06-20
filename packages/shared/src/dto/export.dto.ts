/**
 * 导出分享 DTO
 * 参考：08_导出分享与交付输出实施清单.md
 *
 * 覆盖：导出类型、格式、创建请求、响应、共享页
 */
import type { GoalStageEnum } from '../enums/index.js';

/** 导出类型 */
export enum ExportTypeEnum {
  /** 行动清单：聚焦待办与下一步 */
  ACTION_LIST = 'action_list',
  /** 阶段计划：完整规划结构 */
  PHASE_PLAN = 'phase_plan',
  /** 汇报摘要：面向汇报的结构化摘要 */
  REPORT_SUMMARY = 'report_summary',
  /** 复盘摘要：面向复盘的结构化回顾 */
  REVIEW_SUMMARY = 'review_summary',
  /** 演示提纲：面向演讲的提纲 */
  PRESENTATION_OUTLINE = 'presentation_outline',
}

export const EXPORT_TYPE_LABELS: Record<ExportTypeEnum, string> = {
  [ExportTypeEnum.ACTION_LIST]: '行动清单',
  [ExportTypeEnum.PHASE_PLAN]: '阶段计划',
  [ExportTypeEnum.REPORT_SUMMARY]: '汇报摘要',
  [ExportTypeEnum.REVIEW_SUMMARY]: '复盘摘要',
  [ExportTypeEnum.PRESENTATION_OUTLINE]: '演示提纲',
};

export const EXPORT_TYPE_DESCRIPTIONS: Record<ExportTypeEnum, string> = {
  [ExportTypeEnum.ACTION_LIST]: '聚焦待办任务与下一步行动，适合日常推进',
  [ExportTypeEnum.PHASE_PLAN]: '完整阶段规划，含任务、风险、里程碑',
  [ExportTypeEnum.REPORT_SUMMARY]: '面向汇报的结构化摘要，突出进展与成果',
  [ExportTypeEnum.REVIEW_SUMMARY]: '面向复盘的结构化回顾，含完成情况与反思',
  [ExportTypeEnum.PRESENTATION_OUTLINE]: '面向演讲的提纲，按演示节奏组织',
};

/** 导出格式 */
export enum ExportFormatEnum {
  /** Markdown 文件 */
  MARKDOWN = 'markdown',
  /** 可打印页面（浏览器打印为 PDF） */
  PRINTABLE = 'printable',
}

export const EXPORT_FORMAT_LABELS: Record<ExportFormatEnum, string> = {
  [ExportFormatEnum.MARKDOWN]: 'Markdown',
  [ExportFormatEnum.PRINTABLE]: '可打印页面',
};

/** 导出状态 */
export enum ExportStatusEnum {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

/** 创建导出请求 */
export interface CreateExportRequestDto {
  type: ExportTypeEnum;
  format: ExportFormatEnum;
  /** 自定义标题（可选，默认用目标标题 + 类型） */
  title?: string;
}

/** 更新分享设置请求 */
export interface UpdateShareSettingsRequestDto {
  /** 是否启用分享（生成/撤销 token） */
  enableShare?: boolean;
  /** 分享过期时间（ISO 字符串，null 表示永不过期） */
  shareExpiresAt?: string | null;
  /** 是否允许下载 */
  allowDownload?: boolean;
}

/** 导出记录响应 */
export interface ExportResponseDto {
  id: string;
  goalId: string;
  type: ExportTypeEnum;
  format: ExportFormatEnum;
  title: string;
  /** Markdown 内容 */
  content: string;
  status: ExportStatusEnum;
  errorMessage: string | null;
  shareToken: string | null;
  shareExpiresAt: string | null;
  allowDownload: boolean;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  /** 分享链接是否有效 */
  isShareActive: boolean;
}

/** 共享页响应（公开访问，精简字段） */
export interface SharePageResponseDto {
  title: string;
  type: ExportTypeEnum;
  typeLabel: string;
  content: string;
  format: ExportFormatEnum;
  allowDownload: boolean;
  /** 目标标题 */
  goalTitle: string;
  /** 目标场景类型 */
  scenarioType: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 是否已过期 */
  isExpired: boolean;
}

/** 导出记录列表项（精简，不含 content） */
export interface ExportListItemDto {
  id: string;
  goalId: string;
  type: ExportTypeEnum;
  format: ExportFormatEnum;
  title: string;
  status: ExportStatusEnum;
  shareToken: string | null;
  shareExpiresAt: string | null;
  isShareActive: boolean;
  createdAt: string;
}

/** 导出内容上下文（聚合目标+规划+任务，用于生成 Markdown） */
export interface ExportContextDto {
  goal: {
    id: string;
    title: string;
    topic: string;
    scenarioType: string | null;
    currentStage: GoalStageEnum;
    successCriteria: string | null;
    timeConstraint: string | null;
    resourceConstraint: string | null;
    priority: string | null;
  };
  plan: {
    version: number;
    content: {
      summary: string;
      phases: Array<{
        id: string;
        name: string;
        order: number;
        description: string;
        tasks: Array<{ id: string; title: string; description: string; priority: string }>;
      }>;
      risks: Array<{ id: string; description: string; impact: string; mitigation: string }>;
      milestones: Array<{ id: string; name: string; description: string; targetDate?: string }>;
      nextActions: string[];
      assumptions: string[];
    } | null;
  };
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    stageName: string | null;
    dueDate: string | null;
    completedAt: string | null;
    blockerNote: string | null;
  }>;
  progress: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    blockedTasks: number;
    inProgressTasks: number;
  };
}

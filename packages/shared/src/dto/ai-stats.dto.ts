/**
 * AI 调用统计 DTO（成本统计）
 * 参考：11_后端平台数据层与AI基础设施实施清单.md §5
 *
 * 基于 AiCallLog 聚合，按模型定价估算成本。
 */

/** 单个模型的统计 */
export interface ModelStatDto {
  /** 模型名 */
  model: string;
  /** 调用次数 */
  callCount: number;
  /** 成功次数 */
  successCount: number;
  /** 输入 token 总数 */
  inputTokens: number;
  /** 输出 token 总数 */
  outputTokens: number;
  /** 估算成本（美元） */
  costUsd: number;
}

/** 按日统计 */
export interface DailyStatDto {
  /** 日期（YYYY-MM-DD） */
  date: string;
  /** 调用次数 */
  callCount: number;
  /** 成功次数 */
  successCount: number;
  /** 估算成本（美元） */
  costUsd: number;
}

/** 按提示词统计 */
export interface PromptStatDto {
  /** 提示词名 */
  promptName: string;
  /** 调用次数 */
  callCount: number;
  /** 平均耗时（毫秒） */
  avgDurationMs: number;
}

/** AI 调用统计响应 */
export interface AiCallStatsDto {
  /** 统计时间范围（天） */
  days: number;
  /** 总调用次数 */
  totalCalls: number;
  /** 总成功次数 */
  totalSuccess: number;
  /** 总输入 token */
  totalInputTokens: number;
  /** 总输出 token */
  totalOutputTokens: number;
  /** 总估算成本（美元） */
  totalCostUsd: number;
  /** 平均耗时（毫秒） */
  avgDurationMs: number;
  /** 按模型统计 */
  byModel: ModelStatDto[];
  /** 按日统计（最近 N 天） */
  byDay: DailyStatDto[];
  /** 按提示词统计 */
  byPrompt: PromptStatDto[];
}

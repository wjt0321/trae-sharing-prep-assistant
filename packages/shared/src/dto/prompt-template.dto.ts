/**
 * 提示词模板 DTO（Prompt Registry）
 * 参考：11_后端平台数据层与AI基础设施实施清单.md §5
 *
 * 设计：
 * - 按 name 索引（如 goal.detect_scenario / plan.generate）
 * - 支持版本号，同一 name 只有一个 isActive=true
 * - userTemplate 支持 {{var}} 占位符，由 AiGateway 渲染
 */

// ============================================================
// 响应 DTO
// ============================================================

/** 提示词模板（响应） */
export interface PromptTemplateDto {
  id: string;
  /** 模板名（如 goal.detect_scenario） */
  name: string;
  /** 描述 */
  description: string | null;
  /** 系统提示词 */
  systemPrompt: string;
  /** 用户提示词模板（支持 {{var}} 占位符） */
  userTemplate: string;
  /** 变量名列表 */
  variables: string[];
  /** 版本号 */
  version: number;
  /** 是否为当前活跃版本 */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 输入 DTO
// ============================================================

/** 创建提示词模板 */
export interface CreatePromptTemplateDto {
  name: string;
  description?: string;
  systemPrompt: string;
  userTemplate: string;
  variables?: string[];
}

/** 更新提示词模板（创建新版本） */
export interface UpdatePromptTemplateDto {
  description?: string;
  systemPrompt?: string;
  userTemplate?: string;
  variables?: string[];
}

/** 渲染预览（传入变量值，返回拼装后的 messages） */
export interface RenderPromptDto {
  /** 变量键值对 */
  variables: Record<string, string>;
}

// ============================================================
// 渲染结果 DTO
// ============================================================

/** 渲染结果（预览用） */
export interface RenderedPromptDto {
  /** 模板名 */
  name: string;
  /** 版本号 */
  version: number;
  /** 拼装后的消息数组（发给 AI 网关） */
  messages: Array<{ role: string; content: string }>;
}

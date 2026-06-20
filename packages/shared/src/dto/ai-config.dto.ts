/**
 * AI 网关配置 DTO
 * 参考：11_后端平台数据层与AI基础设施实施清单.md
 *
 * 设计原则：
 * - 不硬编码：URL / API Key / 模型名由网页端设置，存入数据库
 * - 隐式存储：API Key 加密后存入 SQLite，不落明文配置文件
 * - 不主动泄露：读取时只返回掩码（如 sk-****abcd），仅在实际调用时解密
 */

// ============================================================
// 枚举
// ============================================================

/** AI 服务商类型（OpenAI 兼容协议） */
export const AiProviderEnum = {
  MOCK: 'mock',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  CUSTOM: 'custom',
} as const;

export type AiProviderType = (typeof AiProviderEnum)[keyof typeof AiProviderEnum];

// ============================================================
// 响应 DTO
// ============================================================

/** AI 网关配置响应（API Key 已掩码，不泄露明文） */
export interface AiProviderConfigDto {
  /** 是否已配置（false 表示当前为 mock 模式） */
  configured: boolean;
  /** 服务商类型 */
  provider: string;
  /** 接口地址（如 https://api.openai.com/v1） */
  baseUrl: string;
  /** 模型名称（如 gpt-4o-mini） */
  modelName: string;
  /** API Key 掩码（仅末尾 4 位，如 sk-****abcd） */
  apiKeyMasked: string;
  /** 是否为当前活跃配置 */
  isActive: boolean;
  /** 更新时间 */
  updatedAt: string | null;
}

// ============================================================
// 输入 DTO
// ============================================================

/** 更新 AI 网关配置（网页端设置） */
export interface UpdateAiProviderConfigDto {
  /** 服务商类型 */
  provider: string;
  /** 接口地址 */
  baseUrl: string;
  /** API Key 明文（仅在此传输，落库前加密） */
  apiKey: string;
  /** 模型名称 */
  modelName: string;
}

/** 测试 AI 网关连通性（不落库） */
export interface TestAiConfigDto {
  /** 服务商类型 */
  provider: string;
  /** 接口地址 */
  baseUrl: string;
  /** API Key 明文（仅用于测试，不落库） */
  apiKey: string;
  /** 模型名称 */
  modelName: string;
}

// ============================================================
// 测试结果 DTO
// ============================================================

/** 连通性测试结果 */
export interface TestAiConfigResultDto {
  /** 是否连通（避免与 ApiResponse.success 冲突，使用 connected） */
  connected: boolean;
  /** 耗时（毫秒） */
  durationMs: number;
  /** 模型返回的示例内容 */
  sampleContent: string;
  /** 失败原因（connected=false 时有值） */
  errorMessage: string | null;
}

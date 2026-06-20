/**
 * 目标 DTO
 * 沿用 legacy-demo 中 HeroSection 的结构化输入，并扩展为后端持久化形态
 */
import type { GoalTypeEnum } from '../enums/goal-type.enum.js';

/** 创建目标请求 */
export interface CreateGoalRequestDto {
  /** 自然语言目标描述 */
  topic: string;
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
  /** 所属工作区 ID */
  workspaceId: string;
}

/** 目标响应 */
export interface GoalResponseDto {
  id: string;
  workspaceId: string;
  topic: string;
  audience: string | null;
  duration: number | null;
  shareDate: string | null;
  goalType: GoalTypeEnum | null;
  preparedness: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 更新目标请求 */
export interface UpdateGoalRequestDto {
  topic?: string;
  audience?: string;
  duration?: number;
  shareDate?: string;
  goalType?: GoalTypeEnum;
  preparedness?: string;
}

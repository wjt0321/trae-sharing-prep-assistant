import { Injectable } from '@nestjs/common';

/**
 * 登录失败追踪器（内存级）
 * 参考：13_代码审查与安全加固迭代计划.md §1.1
 *
 * 策略：
 * - 邮箱维度失败计数
 * - 第 5 次失败起递增延迟（5s/10s/15s/20s/25s，上限 30s）
 * - 第 10 次失败起锁定 15 分钟
 * - 15 分钟无尝试自动重置计数
 */

interface LoginAttemptState {
  count: number;
  lastAttempt: number; // Date.now() 时间戳
  lockedUntil: number | null; // Date.now() 时间戳，null 表示未锁定
}

export interface FailureRecordResult {
  count: number;
  locked: boolean;
  remainingMs: number; // 锁定剩余毫秒（未锁定时为 0）
}

export interface LockStatus {
  locked: boolean;
  remainingMs: number;
}

const DELAY_THRESHOLD = 5; // 第 5 次失败起开始延迟
const LOCK_THRESHOLD = 10; // 第 10 次失败起锁定
const LOCK_DURATION_MS = 15 * 60 * 1000; // 锁定 15 分钟
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 分钟无尝试自动重置
const MAX_DELAY_MS = 30_000; // 单次延迟上限 30 秒
const DELAY_STEP_MS = 5_000; // 每次递增 5 秒

@Injectable()
export class LoginAttemptTracker {
  private readonly attempts = new Map<string, LoginAttemptState>();

  /** 锁定阈值（供外部读取剩余尝试次数） */
  readonly lockThreshold = LOCK_THRESHOLD;

  /**
   * 检查邮箱是否处于锁定状态
   */
  isLocked(email: string): LockStatus {
    const state = this.attempts.get(email);
    if (!state || !state.lockedUntil) {
      return { locked: false, remainingMs: 0 };
    }
    const now = Date.now();
    if (now < state.lockedUntil) {
      return { locked: true, remainingMs: state.lockedUntil - now };
    }
    // 锁定已过期，清除记录
    this.attempts.delete(email);
    return { locked: false, remainingMs: 0 };
  }

  /**
   * 获取下次尝试前需要等待的延迟（毫秒）
   * 基于当前累计失败次数计算
   */
  getDelay(email: string): number {
    const state = this.attempts.get(email);
    if (!state || state.count < DELAY_THRESHOLD) return 0;
    // 第 5 次失败后，第 6 次尝试延迟 5s；第 6 次失败后，第 7 次延迟 10s…
    const steps = state.count - DELAY_THRESHOLD + 1;
    return Math.min(steps * DELAY_STEP_MS, MAX_DELAY_MS);
  }

  /**
   * 记录一次失败尝试
   */
  recordFailure(email: string): FailureRecordResult {
    const now = Date.now();
    let state = this.attempts.get(email);

    // 超过重置窗口则重新计数
    if (!state || (state.lastAttempt && now - state.lastAttempt > RESET_WINDOW_MS)) {
      state = { count: 0, lastAttempt: now, lockedUntil: null };
    }

    state.count += 1;
    state.lastAttempt = now;

    if (state.count >= LOCK_THRESHOLD) {
      state.lockedUntil = now + LOCK_DURATION_MS;
    }

    this.attempts.set(email, state);

    return {
      count: state.count,
      locked: state.count >= LOCK_THRESHOLD,
      remainingMs: state.lockedUntil ? state.lockedUntil - now : 0,
    };
  }

  /**
   * 登录成功后清除失败记录
   */
  clear(email: string): void {
    this.attempts.delete(email);
  }

  /**
   * 获取剩余尝试次数（锁定前）
   */
  getRemainingAttempts(email: string): number {
    const state = this.attempts.get(email);
    if (!state) return LOCK_THRESHOLD;
    return Math.max(0, LOCK_THRESHOLD - state.count);
  }
}

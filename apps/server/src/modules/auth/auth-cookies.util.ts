import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';

/**
 * Auth Cookie 工具
 * 参考：13_代码审查与安全加固迭代计划.md §1.4
 *
 * 设计：
 * - Token 存储在 httpOnly Cookie 中，防止 XSS 读取
 * - Secure 标记在生产环境启用（仅 HTTPS 传输）
 * - SameSite=Strict 防止 CSRF
 * - Path=/api 限定 Cookie 作用范围
 */

export const ACCESS_TOKEN_COOKIE = 'atm_access_token';
export const REFRESH_TOKEN_COOKIE = 'atm_refresh_token';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number; // 毫秒
}

export class AuthCookieUtil {
  /**
   * 设置 access token 和 refresh token Cookie
   */
  static setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
    configService: ConfigService,
  ): void {
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    const refreshExpiresIn = configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshMaxAge = parseExpiresToMs(refreshExpiresIn);

    const accessOptions: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api',
      maxAge: tokens.expiresIn * 1000,
    };

    const refreshOptions: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api',
      maxAge: refreshMaxAge,
    };

    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, accessOptions);
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, refreshOptions);
  }

  /**
   * 清除 auth Cookie（登出时调用）
   */
  static clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/api' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api' });
  }

  /**
   * 从请求中读取 refresh token（优先 Cookie，向后兼容 body）
   */
  static getRefreshTokenFromRequest(req: { cookies?: Record<string, string> } & { body?: { refreshToken?: string } }): string | null {
    return req.cookies?.[REFRESH_TOKEN_COOKIE] ?? req.body?.refreshToken ?? null;
  }
}

function parseExpiresToMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 3600 * 1000,
    d: 86400 * 1000,
  };
  return value * (multipliers[unit] ?? 86400 * 1000);
}

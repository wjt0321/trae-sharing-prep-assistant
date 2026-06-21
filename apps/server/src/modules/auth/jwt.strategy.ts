import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ApiError, ErrorCode } from '@ai-task-manager/shared';
import type { AuthenticatedUser } from './current-user.decorator';
import { ACCESS_TOKEN_COOKIE } from './auth-cookies.util';

interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * 从请求中提取 access token：
 * 优先从 Authorization: Bearer header 读取（向后兼容），
 * 其次从 httpOnly Cookie 读取（安全存储模式）
 */
function extractToken(req: any): string | null {
  // 1. Authorization header（向后兼容）
  const authHeader = req?.headers?.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // 2. httpOnly Cookie
  return req?.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: extractToken,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.email) {
      throw new ApiError(ErrorCode.AUTH_TOKEN_INVALID);
    }
    return { userId: payload.sub, email: payload.email };
  }
}

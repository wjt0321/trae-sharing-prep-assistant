import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ApiError, ErrorCode } from '@ai-task-manager/shared';
import { AuditService } from '../audit/audit.service';
import {
  AuditActionEnum,
  AuditResourceTypeEnum,
  AuditResultEnum,
} from '@ai-task-manager/shared';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { RefreshDto } from './dto/refresh.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';

interface AccessTokenPayload {
  sub: string;
  email: string;
}

interface RefreshTokenPayload {
  sub: string;
  sid: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, meta?: AuditMeta) {
    // 检查邮箱是否已注册
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      await this.auditService.record({
        actorEmail: dto.email,
        action: AuditActionEnum.REGISTER,
        resourceType: AuditResourceTypeEnum.USER,
        result: AuditResultEnum.FAILURE,
        errorMessage: '邮箱已被注册',
        ...meta,
      });
      throw new ApiError(ErrorCode.AUTH_EMAIL_ALREADY_USED);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 创建用户 + 个人工作区 + 成员关系（事务保证一致性）
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${dto.displayName}的个人工作区`,
          type: 'personal',
          ownerId: user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'owner',
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { defaultWorkspaceId: workspace.id },
      });

      return { user, workspace };
    });

    this.logger.log(`用户注册成功: ${result.user.email}`);

    await this.auditService.record({
      actorId: result.user.id,
      actorEmail: result.user.email,
      action: AuditActionEnum.REGISTER,
      resourceType: AuditResourceTypeEnum.USER,
      resourceId: result.user.id,
      detail: { displayName: dto.displayName },
      ...meta,
    });

    const tokens = await this.issueTokens(result.user.id, result.user.email);

    return {
      user: this.toUserResponse(result.user, result.workspace.id),
      ...tokens,
    };
  }

  async login(dto: LoginDto, meta?: AuditMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      await this.auditService.record({
        actorEmail: dto.email,
        action: AuditActionEnum.LOGIN,
        resourceType: AuditResourceTypeEnum.SESSION,
        result: AuditResultEnum.FAILURE,
        errorMessage: '用户不存在',
        ...meta,
      });
      throw new ApiError(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.auditService.record({
        actorId: user.id,
        actorEmail: user.email,
        action: AuditActionEnum.LOGIN,
        resourceType: AuditResourceTypeEnum.SESSION,
        result: AuditResultEnum.FAILURE,
        errorMessage: '密码错误',
        ...meta,
      });
      throw new ApiError(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    this.logger.log(`用户登录成功: ${user.email}`);

    await this.auditService.record({
      actorId: user.id,
      actorEmail: user.email,
      action: AuditActionEnum.LOGIN,
      resourceType: AuditResourceTypeEnum.SESSION,
      ...meta,
    });

    const tokens = await this.issueTokens(user.id, user.email);

    return {
      user: this.toUserResponse(user, user.defaultWorkspaceId ?? ''),
      ...tokens,
    };
  }

  async refresh(dto: RefreshDto) {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(dto.refreshToken);
    } catch {
      throw new ApiError(ErrorCode.AUTH_TOKEN_INVALID);
    }

    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sid,
        refreshToken: dto.refreshToken,
        revokedAt: null,
      },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new ApiError(ErrorCode.AUTH_TOKEN_EXPIRED);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      throw new ApiError(ErrorCode.AUTH_TOKEN_INVALID);
    }

    // 轮换 refresh token：吊销旧 session，创建新 session
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email);
    return tokens;
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new ApiError(ErrorCode.UNAUTHORIZED);
    }
    return this.toUserResponse(user, user.defaultWorkspaceId ?? '');
  }

  async logout(userId: string, meta?: AuditMeta) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // 吊销该用户所有活跃 session
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      actorId: userId,
      actorEmail: user?.email,
      action: AuditActionEnum.LOGOUT,
      resourceType: AuditResourceTypeEnum.SESSION,
      ...meta,
    });

    return { success: true };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, meta?: AuditMeta) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(ErrorCode.UNAUTHORIZED);
    }

    const data: { displayName?: string; avatarUrl?: string | null } = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    this.logger.log(`用户资料已更新: ${updated.email}`);

    await this.auditService.record({
      actorId: userId,
      actorEmail: updated.email,
      action: AuditActionEnum.UPDATE,
      resourceType: AuditResourceTypeEnum.USER,
      resourceId: userId,
      detail: {
        fieldsChanged: Object.keys(data),
      },
      ...meta,
    });

    return this.toUserResponse(updated, updated.defaultWorkspaceId ?? '');
  }

  async changePassword(userId: string, dto: ChangePasswordDto, meta?: AuditMeta) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(ErrorCode.UNAUTHORIZED);
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      await this.auditService.record({
        actorId: userId,
        actorEmail: user.email,
        action: AuditActionEnum.PASSWORD_CHANGE,
        resourceType: AuditResourceTypeEnum.USER,
        resourceId: userId,
        result: AuditResultEnum.FAILURE,
        errorMessage: '当前密码不正确',
        ...meta,
      });
      throw new ApiError(ErrorCode.AUTH_INVALID_CREDENTIALS, {
        message: '当前密码不正确',
      });
    }

    // 新密码不能与旧密码相同
    if (dto.currentPassword === dto.newPassword) {
      throw new ApiError(ErrorCode.BAD_REQUEST, {
        message: '新密码不能与当前密码相同',
      });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // 修改密码后吊销所有 session，用户需重新登录
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`用户密码已修改: ${user.email}`);

    await this.auditService.record({
      actorId: userId,
      actorEmail: user.email,
      action: AuditActionEnum.PASSWORD_CHANGE,
      resourceType: AuditResourceTypeEnum.USER,
      resourceId: userId,
      detail: { sessionsRevoked: true },
      ...meta,
    });

    return { success: true };
  }

  /**
   * 签发 access token + refresh token，并创建 session 记录
   */
  private async issueTokens(userId: string, email: string) {
    const accessPayload: AccessTokenPayload = { sub: userId, email };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1d');
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: expiresIn as any,
    });

    const sessionId = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: userId, sid: sessionId };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: refreshExpiresIn as any,
    });

    // 计算 refresh token 过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresToSeconds(expiresIn),
      tokenType: 'Bearer' as const,
    };
  }

  private parseExpiresToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 86400;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * (multipliers[unit] ?? 86400);
  }

  private toUserResponse(
    user: { id: string; email: string; displayName: string; avatarUrl: string | null },
    defaultWorkspaceId: string,
  ) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      defaultWorkspaceId,
    };
  }
}

/**
 * 审计元信息（由 Controller 从请求中提取并传入）
 */
export interface AuditMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  method?: string | null;
  path?: string | null;
}

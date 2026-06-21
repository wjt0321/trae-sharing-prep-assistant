import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginAttemptTracker } from './login-attempt.tracker';
import { ApiError, ErrorCode } from '@ai-task-manager/shared';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<any>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let auditService: jest.Mocked<Pick<AuditService, 'record'>>;
  let loginAttemptTracker: jest.Mocked<LoginAttemptTracker>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      workspace: {
        create: jest.fn(),
      },
      workspaceMember: {
        create: jest.fn(),
      },
      session: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    } as any;

    configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'JWT_EXPIRES_IN') return '1d';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        if (key === 'BCRYPT_SALT_ROUNDS') return 10; // 测试用低 rounds 加速
        return defaultValue;
      }),
    } as any;

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as any;

    loginAttemptTracker = {
      isLocked: jest.fn().mockReturnValue({ locked: false, remainingMs: 0 }),
      getDelay: jest.fn().mockReturnValue(0),
      recordFailure: jest.fn().mockReturnValue({ count: 0, locked: false, remainingMs: 0 }),
      clear: jest.fn(),
      lockThreshold: 10,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuditService, useValue: auditService },
        { provide: LoginAttemptTracker, useValue: loginAttemptTracker },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ============================================================
  // register()
  // ============================================================

  describe('register()', () => {
    it('成功注册新用户', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const mockUser = { id: 'user-1', email: 'test@test.com', displayName: 'Test', passwordHash: 'hash' };
      const mockWorkspace = { id: 'ws-1', name: 'Test的个人工作区' };
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue({ ...mockUser, defaultWorkspaceId: mockWorkspace.id }),
          },
          workspace: { create: jest.fn().mockResolvedValue(mockWorkspace) },
          workspaceMember: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
        displayName: 'Test',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('token');
      expect(result.refreshToken).toBe('token');
    });

    it('重复邮箱注册被拒绝', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'test@test.com' });

      await expect(
        service.register({
          email: 'test@test.com',
          password: 'password123',
          displayName: 'Test',
        }),
      ).rejects.toThrow(ApiError);

      try {
        await service.register({
          email: 'test@test.com',
          password: 'password123',
          displayName: 'Test',
        });
      } catch (e) {
        expect((e as ApiError).code).toBe(ErrorCode.AUTH_EMAIL_ALREADY_USED.code);
      }
    });

    it('密码使用 bcrypt 哈希存储（非明文）', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const mockUser = { id: 'user-1', email: 'test@test.com', displayName: 'Test', passwordHash: 'hashed' };
      const mockWorkspace = { id: 'ws-1', name: 'Test的个人工作区' };

      let capturedPasswordHash: string | undefined;
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const txUserCreate = jest.fn().mockImplementation((args) => {
          capturedPasswordHash = args.data.passwordHash;
          return mockUser;
        });
        const tx = {
          user: {
            create: txUserCreate,
            update: jest.fn().mockResolvedValue(mockUser),
          },
          workspace: { create: jest.fn().mockResolvedValue(mockWorkspace) },
          workspaceMember: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      jwtService.signAsync.mockResolvedValue('token');

      await service.register({
        email: 'test@test.com',
        password: 'plaintext-password',
        displayName: 'Test',
      });

      expect(capturedPasswordHash).toBeDefined();
      expect(capturedPasswordHash).not.toBe('plaintext-password');
      // bcrypt hash 以 $2b$ 开头
      expect(capturedPasswordHash).toMatch(/^\$2[abxy]\$/);
    });
  });

  // ============================================================
  // login()
  // ============================================================

  describe('login()', () => {
    it('正确凭证登录成功', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        displayName: 'Test',
        passwordHash,
        defaultWorkspaceId: 'ws-1',
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('token');
      expect(loginAttemptTracker.clear).toHaveBeenCalledWith('test@test.com');
    });

    it('用户不存在时拒绝', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      loginAttemptTracker.recordFailure.mockReturnValue({
        count: 1,
        locked: false,
        remainingMs: 0,
      });

      await expect(
        service.login({ email: 'nobody@test.com', password: 'password123' }),
      ).rejects.toThrow(ApiError);

      expect(loginAttemptTracker.recordFailure).toHaveBeenCalledWith('nobody@test.com');
    });

    it('错误密码拒绝', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash,
        defaultWorkspaceId: 'ws-1',
      });
      loginAttemptTracker.recordFailure.mockReturnValue({
        count: 1,
        locked: false,
        remainingMs: 0,
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(ApiError);

      expect(loginAttemptTracker.recordFailure).toHaveBeenCalledWith('test@test.com');
    });

    it('账户锁定时拒绝', async () => {
      loginAttemptTracker.isLocked.mockReturnValue({
        locked: true,
        remainingMs: 15 * 60 * 1000,
      });

      await expect(
        service.login({ email: 'locked@test.com', password: 'password123' }),
      ).rejects.toThrow(ApiError);

      try {
        await service.login({ email: 'locked@test.com', password: 'password123' });
      } catch (e) {
        expect((e as ApiError).code).toBe(ErrorCode.AUTH_ACCOUNT_LOCKED.code);
      }
    });

    it('登录成功后清除失败计数', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash,
        defaultWorkspaceId: 'ws-1',
      });
      jwtService.signAsync.mockResolvedValue('token');

      await service.login({ email: 'test@test.com', password: 'password123' });

      expect(loginAttemptTracker.clear).toHaveBeenCalledWith('test@test.com');
    });
  });

  // ============================================================
  // refresh()
  // ============================================================

  describe('refresh()', () => {
    it('有效 refresh token 刷新成功', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', sid: 'session-1' });
      prisma.session.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'any-hash',
        expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      });
      jwtService.signAsync.mockResolvedValue('new-token');
      prisma.session.update.mockResolvedValue({});

      const result = await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(result.accessToken).toBe('new-token');
      expect(result.refreshToken).toBe('new-token');
    });

    it('无效 refresh token 拒绝', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(
        service.refresh({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(ApiError);
    });

    it('过期 session 拒绝', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', sid: 'session-1' });
      prisma.session.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() - 86400000), // 已过期
      });

      await expect(
        service.refresh({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(ApiError);

      try {
        await service.refresh({ refreshToken: 'expired-token' });
      } catch (e) {
        expect((e as ApiError).code).toBe(ErrorCode.AUTH_TOKEN_EXPIRED.code);
      }
    });

    it('session 不存在拒绝', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', sid: 'session-1' });
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: 'nonexistent-token' }),
      ).rejects.toThrow(ApiError);
    });
  });

  // ============================================================
  // changePassword()
  // ============================================================

  describe('changePassword()', () => {
    it('正确当前密码 + 新密码 → 修改成功', async () => {
      const currentHash = await bcrypt.hash('old-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: currentHash,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.session.updateMany.mockResolvedValue({ count: 1 });
      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.changePassword('user-1', {
        currentPassword: 'old-password',
        newPassword: 'new-password123',
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.session.updateMany).toHaveBeenCalled();
    });

    it('错误当前密码拒绝', async () => {
      const currentHash = await bcrypt.hash('correct-old', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: currentHash,
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong-old',
          newPassword: 'new-password123',
        }),
      ).rejects.toThrow(ApiError);
    });

    it('新密码与旧密码相同拒绝', async () => {
      const currentHash = await bcrypt.hash('same-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: currentHash,
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'same-password',
          newPassword: 'same-password',
        }),
      ).rejects.toThrow(ApiError);
    });

    it('修改密码后吊销所有 session', async () => {
      const currentHash = await bcrypt.hash('old-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: currentHash,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.session.updateMany.mockResolvedValue({ count: 3 });

      await service.changePassword('user-1', {
        currentPassword: 'old-password',
        newPassword: 'new-password123',
      });

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });

  // ============================================================
  // logout()
  // ============================================================

  describe('logout()', () => {
    it('登出后吊销所有活跃 session', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      });
      prisma.session.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.logout('user-1');

      expect(result.success).toBe(true);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });
    });
  });

  // ============================================================
  // getCurrentUser()
  // ============================================================

  describe('getCurrentUser()', () => {
    it('返回当前用户信息', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        displayName: 'Test',
        avatarUrl: null,
        defaultWorkspaceId: 'ws-1',
      });

      const result = await service.getCurrentUser('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@test.com');
    });

    it('用户不存在时抛出 UNAUTHORIZED', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('nonexistent')).rejects.toThrow(ApiError);
    });
  });
});

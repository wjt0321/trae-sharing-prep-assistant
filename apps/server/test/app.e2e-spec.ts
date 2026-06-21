/**
 * E2E 测试：完整用户主链路 + 协作流程
 *
 * 覆盖清单 13 阶段四 4.4 要求：
 * - 注册 → 登录 → 创建目标 → 生成规划 → 查看任务 → 更新状态
 * - 协作流程：评论 → 回复 → 指派 → 解决
 *
 * 运行方式：cd apps/server && pnpm run test:e2e
 * 数据库：使用 test.e2e.db（独立于开发数据库），测试后自动清理
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/infrastructure/prisma/prisma.service';

// 测试数据库文件路径（Prisma 的 file:./ 相对于 schema.prisma 所在目录解析）
const TEST_DB_PATH = join(__dirname, '..', 'prisma', 'test.e2e.db');
const TEST_DB_JOURNAL_PATH = join(__dirname, '..', 'prisma', 'test.e2e.db-journal');

// 共享的应用实例和状态
let app: INestApplication;
let prisma: PrismaService;
let accessToken: string;
let userId: string;
let workspaceId: string;

beforeAll(async () => {
  // 清理旧测试数据库
  for (const filePath of [TEST_DB_PATH, TEST_DB_JOURNAL_PATH]) {
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch {
        // Windows 可能因文件锁忽略
      }
    }
  }

  // 运行 Prisma 迁移，创建表结构
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
    env: process.env,
  });

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  // 复制 main.ts 的全局配置
  app.use(cookieParser());
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  prisma = app.get(PrismaService);
}, 120000);

afterAll(async () => {
  await app.close();

  // 清理测试数据库
  for (const filePath of [TEST_DB_PATH, TEST_DB_JOURNAL_PATH]) {
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch {
        // 忽略清理失败
      }
    }
  }
}, 30000);

/**
 * 创建带认证 header 的请求辅助函数
 */
function authRequest(method: 'get' | 'post' | 'patch' | 'delete', url: string) {
  const req = request(app.getHttpServer())[method](url);
  if (accessToken) {
    req.set('Authorization', `Bearer ${accessToken}`);
  }
  return req;
}

// ============================================================
// E2E: 完整用户主链路
// ============================================================
describe('E2E: 完整用户主链路', () => {
  let goalId: string;
  let planId: string;
  let taskId: string;

  // ============================================================
  // 1. 注册
  // ============================================================
  describe('注册流程', () => {
    it('POST /api/auth/register 成功注册新用户', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e-user@example.com',
          password: 'password123',
          displayName: 'E2E测试用户',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('e2e-user@example.com');
      expect(res.body.data.user.displayName).toBe('E2E测试用户');
      expect(res.body.data.user.defaultWorkspaceId).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();

      userId = res.body.data.user.id;
      workspaceId = res.body.data.user.defaultWorkspaceId;
      accessToken = res.body.data.accessToken;
    });

    it('POST /api/auth/register 重复邮箱注册失败', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e-user@example.com',
          password: 'password123',
          displayName: '重复用户',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  // ============================================================
  // 2. 登录
  // ============================================================
  describe('登录流程', () => {
    it('POST /api/auth/login 错误密码登录失败', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e-user@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login 成功登录', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'e2e-user@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('e2e-user@example.com');
      expect(res.body.data.accessToken).toBeDefined();

      accessToken = res.body.data.accessToken;
    });
  });

  // ============================================================
  // 3. 获取当前用户
  // ============================================================
  describe('认证状态', () => {
    it('GET /api/auth/me 返回当前登录用户', async () => {
      const res = await authRequest('get', '/api/auth/me').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.email).toBe('e2e-user@example.com');
    });

    it('GET /api/auth/me 未认证返回 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // 4. 创建目标
  // ============================================================
  describe('创建目标', () => {
    it('POST /api/goals 成功创建目标', async () => {
      const res = await authRequest('post', '/api/goals')
        .send({
          topic: '准备一次技术分享会',
          workspaceId: workspaceId,
          scenarioType: 'sharing_prep',
          audience: '团队工程师',
          duration: 30,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.topic).toBe('准备一次技术分享会');
      expect(res.body.data.scenarioType).toBe('sharing_prep');

      goalId = res.body.data.id;
    });

    it('GET /api/goals 返回已创建的目标', async () => {
      const res = await authRequest('get', `/api/goals?workspaceId=${workspaceId}`).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((g: any) => g.id === goalId)).toBe(true);
    });

    it('GET /api/goals/:id 返回目标详情', async () => {
      const res = await authRequest('get', `/api/goals/${goalId}`).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(goalId);
      expect(res.body.data.topic).toBe('准备一次技术分享会');
    });
  });

  // ============================================================
  // 5. 生成规划
  // ============================================================
  describe('生成规划', () => {
    it('POST /api/goals/:goalId/plans 成功生成规划', async () => {
      const res = await authRequest('post', `/api/goals/${goalId}/plans`)
        .send({})
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.content).toBeDefined();
      expect(res.body.data.content.phases).toBeDefined();
      expect(Array.isArray(res.body.data.content.phases)).toBe(true);
      expect(res.body.data.content.phases.length).toBeGreaterThan(0);

      planId = res.body.data.id;
    });

    it('GET /api/goals/:goalId/plans/active 返回活跃规划', async () => {
      const res = await authRequest('get', `/api/goals/${goalId}/plans/active`).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(planId);
      expect(res.body.data.isActive).toBe(true);
    });

    it('POST /api/goals/:goalId/plans 重复生成（无 force）返回冲突', async () => {
      const res = await authRequest('post', `/api/goals/${goalId}/plans`)
        .send({})
        .expect(409);

      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // 6. 查看任务 + 同步任务
  // ============================================================
  describe('任务同步', () => {
    it('GET /api/goals/:goalId/tasks 初始为空', async () => {
      const res = await authRequest('get', `/api/goals/${goalId}/tasks`).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('POST /api/goals/:goalId/tasks/sync-from-plan 成功同步任务', async () => {
      const res = await authRequest('post', `/api/goals/${goalId}/tasks/sync-from-plan`)
        .send({})
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.created).toBeGreaterThan(0);
    });

    it('GET /api/goals/:goalId/tasks 同步后返回任务列表', async () => {
      const res = await authRequest('get', `/api/goals/${goalId}/tasks`).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      taskId = res.body.data[0].id;
      expect(taskId).toBeDefined();
      expect(res.body.data[0].status).toBe('pending');
    });

    it('GET /api/goals/:goalId/tasks/progress 返回进度统计', async () => {
      const res = await authRequest('get', `/api/goals/${goalId}/tasks/progress`).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.totalTasks).toBeGreaterThan(0);
      expect(res.body.data.completedTasks).toBe(0);
    });
  });

  // ============================================================
  // 7. 更新任务状态
  // ============================================================
  describe('任务状态推进', () => {
    it('PATCH /api/tasks/:id/status pending → in_progress', async () => {
      const res = await authRequest('patch', `/api/tasks/${taskId}/status`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('PATCH /api/tasks/:id/status in_progress → completed', async () => {
      const res = await authRequest('patch', `/api/tasks/${taskId}/status`)
        .send({ status: 'completed' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
    });

    it('PATCH /api/tasks/:id/status completed → blocked 被拒绝（仅允许回退到 in_progress）', async () => {
      const res = await authRequest('patch', `/api/tasks/${taskId}/status`)
        .send({ status: 'blocked', blockerNote: '测试阻塞' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('GET /api/tasks/:id/history 返回状态历史', async () => {
      const res = await authRequest('get', `/api/tasks/${taskId}/history`).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ============================================================
// E2E: 协作流程
// ============================================================
describe('E2E: 协作流程', () => {
  let goalId: string;
  let taskId: string;
  let commentId: string;

  beforeAll(async () => {
    // 注册第二个用户用于协作测试
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'e2e-collab@example.com',
        password: 'password123',
        displayName: '协作测试用户',
      })
      .expect(201);

    workspaceId = registerRes.body.data.user.defaultWorkspaceId;
    accessToken = registerRes.body.data.accessToken;
    userId = registerRes.body.data.user.id;

    // 创建目标
    const goalRes = await authRequest('post', '/api/goals')
      .send({
        topic: '协作流程测试目标',
        workspaceId: workspaceId,
        scenarioType: 'small_project',
      })
      .expect(201);
    goalId = goalRes.body.data.id;

    // 生成规划
    await authRequest('post', `/api/goals/${goalId}/plans`).send({}).expect(201);

    // 同步任务
    await authRequest('post', `/api/goals/${goalId}/tasks/sync-from-plan`)
      .send({})
      .expect(201);

    // 获取第一个任务
    const tasksRes = await authRequest('get', `/api/goals/${goalId}/tasks`).expect(200);
    taskId = tasksRes.body.data[0].id;
  });

  // ============================================================
  // 1. 评论
  // ============================================================
  describe('评论', () => {
    it('POST /api/goals/:goalId/comments 成功创建评论', async () => {
      const res = await authRequest('post', `/api/goals/${goalId}/comments`)
        .send({
          content: '这是一个测试评论',
          anchorType: 'goal',
          anchorId: goalId,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.content).toBe('这是一个测试评论');
      expect(res.body.data.resolvedAt).toBeNull();

      commentId = res.body.data.id;
    });

    it('GET /api/goals/:goalId/comments 返回评论列表', async () => {
      const res = await authRequest('get', `/api/goals/${goalId}/comments`).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some((c: any) => c.id === commentId)).toBe(true);
    });
  });

  // ============================================================
  // 2. 回复评论
  // ============================================================
  describe('回复评论', () => {
    it('POST /api/goals/:goalId/comments 成功回复评论', async () => {
      const res = await authRequest('post', `/api/goals/${goalId}/comments`)
        .send({
          content: '这是对评论的回复',
          parentId: commentId,
          anchorType: 'goal',
          anchorId: goalId,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.content).toBe('这是对评论的回复');
      expect(res.body.data.parentId).toBe(commentId);
    });
  });

  // ============================================================
  // 3. 解决评论
  // ============================================================
  describe('解决评论', () => {
    it('POST /api/comments/:id/resolve 成功解决评论', async () => {
      const res = await authRequest('post', `/api/comments/${commentId}/resolve`).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resolvedAt).not.toBeNull();
    });

    it('POST /api/comments/:id/reopen 重新打开评论', async () => {
      const res = await authRequest('post', `/api/comments/${commentId}/reopen`).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resolvedAt).toBeNull();
    });
  });

  // ============================================================
  // 4. 任务指派
  // ============================================================
  describe('任务指派', () => {
    it('POST /api/tasks/:taskId/assign 成功指派任务', async () => {
      const res = await authRequest('post', `/api/tasks/${taskId}/assign`)
        .send({
          assigneeId: userId,
          note: '指派给自己',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('GET /api/tasks/:taskId/assignments 返回指派历史', async () => {
      const res = await authRequest('get', `/api/tasks/${taskId}/assignments`).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('DELETE /api/tasks/:taskId/assign 取消指派', async () => {
      const res = await authRequest('delete', `/api/tasks/${taskId}/assign`).expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ============================================================
  // 5. 活动流
  // ============================================================
  describe('活动流', () => {
    it('GET /api/goals/:goalId/activities 返回活动列表', async () => {
      const res = await authRequest('get', `/api/goals/${goalId}/activities`).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// E2E: 健康检查
// ============================================================
describe('E2E: 健康检查', () => {
  it('GET /health 返回 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(res.body).toBeDefined();
  });
});

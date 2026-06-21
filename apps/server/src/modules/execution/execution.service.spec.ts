import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionService } from './execution.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { NotificationService } from '../notification/notification.service';
import { GoalPermissionService } from '../goal/goal-permission.service';
import { ApiError, ErrorCode, TaskStatusEnum, GoalStageEnum } from '@ai-task-manager/shared';

describe('ExecutionService', () => {
  let service: ExecutionService;
  let prisma: jest.Mocked<any>;
  let collaborationService: jest.Mocked<Pick<CollaborationService, 'recordActivity'>>;
  let notificationService: jest.Mocked<Pick<NotificationService, 'notifyTaskStatusChanged'>>;
  let goalPermissionService: jest.Mocked<Pick<GoalPermissionService, 'getGoalWithMembershipCheck'>>;

  beforeEach(async () => {
    prisma = {
      executionTask: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      taskStatusHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      plan: {
        findFirst: jest.fn(),
      },
      goal: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    collaborationService = {
      recordActivity: jest.fn().mockResolvedValue(undefined),
    } as any;

    notificationService = {
      notifyTaskStatusChanged: jest.fn().mockResolvedValue(undefined),
    } as any;

    goalPermissionService = {
      getGoalWithMembershipCheck: jest.fn().mockResolvedValue({
        id: 'goal-1',
        workspaceId: 'ws-1',
        currentStage: GoalStageEnum.EXECUTING,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionService,
        { provide: PrismaService, useValue: prisma },
        { provide: CollaborationService, useValue: collaborationService },
        { provide: NotificationService, useValue: notificationService },
        { provide: GoalPermissionService, useValue: goalPermissionService },
      ],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
  });

  // ============================================================
  // 查询
  // ============================================================

  describe('findAll()', () => {
    it('返回目标下所有任务', async () => {
      prisma.executionTask.findMany.mockResolvedValue([
        {
          id: 'task-1',
          goalId: 'goal-1',
          stageId: 'stage-1',
          stageName: '阶段一',
          title: '任务1',
          description: '描述',
          status: TaskStatusEnum.PENDING,
          sortOrder: 0,
          dueDate: null,
          completedAt: null,
          blockerNote: null,
          assigneeId: null,
          creatorId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findAll('goal-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('任务1');
      expect(goalPermissionService.getGoalWithMembershipCheck).toHaveBeenCalledWith('goal-1', 'user-1');
    });

    it('按 status 过滤', async () => {
      prisma.executionTask.findMany.mockResolvedValue([]);

      await service.findAll('goal-1', 'user-1', { status: TaskStatusEnum.PENDING });

      expect(prisma.executionTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: TaskStatusEnum.PENDING }),
        }),
      );
    });
  });

  describe('findOne()', () => {
    it('任务不存在时抛出 EXECUTION_TASK_NOT_FOUND', async () => {
      prisma.executionTask.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(ApiError);
    });
  });

  // ============================================================
  // 任务 CRUD
  // ============================================================

  describe('create()', () => {
    it('成功创建任务', async () => {
      const mockTask = {
        id: 'task-1',
        goalId: 'goal-1',
        stageId: null,
        stageName: null,
        title: '新任务',
        description: '描述',
        status: TaskStatusEnum.PENDING,
        sortOrder: 0,
        dueDate: null,
        completedAt: null,
        blockerNote: null,
        assigneeId: null,
        creatorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.executionTask.create.mockResolvedValue(mockTask);
      prisma.taskStatusHistory.create.mockResolvedValue({});

      const result = await service.create(
        'goal-1',
        { title: '新任务', description: '描述' },
        'user-1',
      );

      expect(result.title).toBe('新任务');
      expect(result.status).toBe(TaskStatusEnum.PENDING);
      // 验证初始状态历史被记录
      expect(prisma.taskStatusHistory.create).toHaveBeenCalled();
    });

    it('目标在规划阶段时自动推进到执行阶段', async () => {
      goalPermissionService.getGoalWithMembershipCheck.mockResolvedValue({
        id: 'goal-1',
        workspaceId: 'ws-1',
        currentStage: GoalStageEnum.PLANNING,
      } as any);
      prisma.executionTask.create.mockResolvedValue({
        id: 'task-1',
        goalId: 'goal-1',
        stageId: null,
        stageName: null,
        title: '新任务',
        description: null,
        status: TaskStatusEnum.PENDING,
        sortOrder: 0,
        dueDate: null,
        completedAt: null,
        blockerNote: null,
        assigneeId: null,
        creatorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create('goal-1', { title: '新任务' }, 'user-1');

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { currentStage: GoalStageEnum.EXECUTING },
      });
    });
  });

  describe('remove()', () => {
    it('软删除任务（标记 deletedAt）', async () => {
      prisma.executionTask.findFirst.mockResolvedValue({
        id: 'task-1',
        goalId: 'goal-1',
        title: '任务',
      });
      prisma.executionTask.update.mockResolvedValue({});

      const result = await service.remove('task-1', 'user-1');

      expect(result.success).toBe(true);
      expect(prisma.executionTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  // ============================================================
  // 状态机
  // ============================================================

  describe('updateStatus() — 状态机校验', () => {
    const mockTask = {
      id: 'task-1',
      goalId: 'goal-1',
      stageId: null,
      stageName: null,
      title: '任务',
      description: null,
      status: TaskStatusEnum.PENDING,
      sortOrder: 0,
      dueDate: null,
      completedAt: null,
      blockerNote: null,
      assigneeId: null,
      creatorId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('pending → in_progress 允许', async () => {
      prisma.executionTask.findFirst.mockResolvedValue({ ...mockTask, status: TaskStatusEnum.PENDING });
      prisma.$transaction.mockResolvedValue([
        { ...mockTask, status: TaskStatusEnum.IN_PROGRESS },
        {},
      ]);

      const result = await service.updateStatus(
        'task-1',
        { status: TaskStatusEnum.IN_PROGRESS },
        'user-1',
      );

      expect(result.status).toBe(TaskStatusEnum.IN_PROGRESS);
    });

    it('pending → completed 允许', async () => {
      prisma.executionTask.findFirst.mockResolvedValue({ ...mockTask, status: TaskStatusEnum.PENDING });
      prisma.$transaction.mockResolvedValue([
        { ...mockTask, status: TaskStatusEnum.COMPLETED, completedAt: new Date() },
        {},
      ]);

      const result = await service.updateStatus(
        'task-1',
        { status: TaskStatusEnum.COMPLETED },
        'user-1',
      );

      expect(result.status).toBe(TaskStatusEnum.COMPLETED);
    });

    it('cancelled → pending 拒绝（终态不可变更）', async () => {
      prisma.executionTask.findFirst.mockResolvedValue({
        ...mockTask,
        status: TaskStatusEnum.CANCELLED,
      });

      await expect(
        service.updateStatus('task-1', { status: TaskStatusEnum.PENDING }, 'user-1'),
      ).rejects.toThrow(ApiError);
    });

    it('blocked 必须填写阻塞原因', async () => {
      prisma.executionTask.findFirst.mockResolvedValue({ ...mockTask, status: TaskStatusEnum.PENDING });

      await expect(
        service.updateStatus('task-1', { status: TaskStatusEnum.BLOCKED }, 'user-1'),
      ).rejects.toThrow(ApiError);

      try {
        await service.updateStatus('task-1', { status: TaskStatusEnum.BLOCKED }, 'user-1');
      } catch (e) {
        expect((e as ApiError).code).toBe(ErrorCode.VALIDATION_FAILED.code);
      }
    });

    it('completed → in_progress 允许（回退）', async () => {
      prisma.executionTask.findFirst.mockResolvedValue({
        ...mockTask,
        status: TaskStatusEnum.COMPLETED,
        completedAt: new Date(),
      });
      prisma.$transaction.mockResolvedValue([
        { ...mockTask, status: TaskStatusEnum.IN_PROGRESS, completedAt: null },
        {},
      ]);

      const result = await service.updateStatus(
        'task-1',
        { status: TaskStatusEnum.IN_PROGRESS },
        'user-1',
      );

      expect(result.status).toBe(TaskStatusEnum.IN_PROGRESS);
    });

    it('completed → completed 拒绝（不允许相同状态流转）', async () => {
      prisma.executionTask.findFirst.mockResolvedValue({
        ...mockTask,
        status: TaskStatusEnum.COMPLETED,
      });

      await expect(
        service.updateStatus('task-1', { status: TaskStatusEnum.COMPLETED }, 'user-1'),
      ).rejects.toThrow(ApiError);
    });
  });

  // ============================================================
  // 批量状态更新
  // ============================================================

  describe('batchUpdateStatus()', () => {
    it('批量更新成功', async () => {
      const tasks = [
        {
          id: 'task-1',
          goalId: 'goal-1',
          title: '任务1',
          status: TaskStatusEnum.PENDING,
          assigneeId: null,
        },
        {
          id: 'task-2',
          goalId: 'goal-1',
          title: '任务2',
          status: TaskStatusEnum.PENDING,
          assigneeId: null,
        },
      ];
      prisma.executionTask.findMany.mockResolvedValue(tasks);
      prisma.$transaction.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ displayName: 'Test' });

      const result = await service.batchUpdateStatus(
        'goal-1',
        {
          updates: [
            { taskId: 'task-1', status: TaskStatusEnum.IN_PROGRESS },
            { taskId: 'task-2', status: TaskStatusEnum.COMPLETED },
          ],
        },
        'user-1',
      );

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('不存在的任务标记为失败', async () => {
      prisma.executionTask.findMany.mockResolvedValue([
        {
          id: 'task-1',
          goalId: 'goal-1',
          title: '任务1',
          status: TaskStatusEnum.PENDING,
          assigneeId: null,
        },
      ]);
      prisma.$transaction.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ displayName: 'Test' });

      const result = await service.batchUpdateStatus(
        'goal-1',
        {
          updates: [
            { taskId: 'task-1', status: TaskStatusEnum.IN_PROGRESS },
            { taskId: 'nonexistent', status: TaskStatusEnum.COMPLETED },
          ],
        },
        'user-1',
      );

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failures[0].taskId).toBe('nonexistent');
    });

    it('终态任务更新标记为失败', async () => {
      prisma.executionTask.findMany.mockResolvedValue([
        {
          id: 'task-1',
          goalId: 'goal-1',
          title: '任务1',
          status: TaskStatusEnum.CANCELLED,
          assigneeId: null,
        },
      ]);

      const result = await service.batchUpdateStatus(
        'goal-1',
        {
          updates: [{ taskId: 'task-1', status: TaskStatusEnum.IN_PROGRESS }],
        },
        'user-1',
      );

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failures[0].reason).toContain('终态');
    });
  });

  // ============================================================
  // syncFromPlan
  // ============================================================

  describe('syncFromPlan() — 去重逻辑', () => {
    const mockPlanContent = {
      summary: '测试规划',
      phases: [
        {
          id: 'phase-1',
          name: '阶段一',
          description: '描述',
          order: 1,
          tasks: [
            { id: 'task-1', title: '规划任务1', description: '描述1', priority: 'high' as const },
            { id: 'task-2', title: '规划任务2', description: '描述2', priority: 'medium' as const },
          ],
        },
      ],
      risks: [],
      milestones: [],
      nextActions: [],
      assumptions: [],
    };

    it('append 模式跳过已存在的任务（按 title + stageId 去重）', async () => {
      prisma.plan.findFirst.mockResolvedValue({
        id: 'plan-1',
        content: JSON.stringify(mockPlanContent),
        isActive: true,
        version: 1,
      });
      // 已存在一个同名任务
      prisma.executionTask.findMany.mockResolvedValue([
        { title: '规划任务1', stageId: 'phase-1' },
      ]);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        if (typeof fn === 'function') {
          const tx = {
            executionTask: { create: jest.fn().mockResolvedValue({ id: 'new-task-2' }) },
            taskStatusHistory: { createMany: jest.fn().mockResolvedValue({}) },
          };
          return fn(tx);
        }
        return [];
      });
      prisma.executionTask.count.mockResolvedValue(2);

      const result = await service.syncFromPlan('goal-1', { replace: false }, 'user-1');

      expect(result.mode).toBe('append');
      expect(result.created).toBe(1); // 只创建了1个（跳过了重复的）
      expect(result.skipped).toBe(1);
      expect(result.removed).toBe(0);
    });

    it('replace 模式先软删除所有现有任务', async () => {
      prisma.plan.findFirst.mockResolvedValue({
        id: 'plan-1',
        content: JSON.stringify(mockPlanContent),
        isActive: true,
        version: 1,
      });
      prisma.executionTask.findMany.mockResolvedValue([{ id: 'old-task-1' }, { id: 'old-task-2' }]);
      prisma.executionTask.updateMany.mockResolvedValue({ count: 2 });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        if (typeof fn === 'function') {
          const tx = {
            executionTask: { create: jest.fn().mockResolvedValue({ id: 'new-task' }) },
            taskStatusHistory: { createMany: jest.fn().mockResolvedValue({}) },
          };
          return fn(tx);
        }
        return [];
      });
      prisma.executionTask.count.mockResolvedValue(2);

      const result = await service.syncFromPlan('goal-1', { replace: true }, 'user-1');

      expect(result.mode).toBe('replace');
      expect(result.removed).toBe(2);
      expect(prisma.executionTask.updateMany).toHaveBeenCalled();
    });

    it('无活跃规划时抛出 PLAN_NOT_FOUND', async () => {
      prisma.plan.findFirst.mockResolvedValue(null);

      await expect(
        service.syncFromPlan('goal-1', {}, 'user-1'),
      ).rejects.toThrow(ApiError);

      try {
        await service.syncFromPlan('goal-1', {}, 'user-1');
      } catch (e) {
        expect((e as ApiError).code).toBe(ErrorCode.PLAN_NOT_FOUND.code);
      }
    });
  });

  // ============================================================
  // getProgress
  // ============================================================

  describe('getProgress()', () => {
    it('正确统计任务进度', async () => {
      prisma.executionTask.findMany.mockResolvedValue([
        { status: TaskStatusEnum.COMPLETED, stageId: 's1', stageName: '阶段1', sortOrder: 0, createdAt: new Date() },
        { status: TaskStatusEnum.IN_PROGRESS, stageId: 's1', stageName: '阶段1', sortOrder: 1, createdAt: new Date() },
        { status: TaskStatusEnum.PENDING, stageId: 's2', stageName: '阶段2', sortOrder: 0, createdAt: new Date() },
        { status: TaskStatusEnum.BLOCKED, stageId: 's2', stageName: '阶段2', sortOrder: 1, createdAt: new Date() },
      ]);

      const result = await service.getProgress('goal-1', 'user-1');

      expect(result.totalTasks).toBe(4);
      expect(result.completedTasks).toBe(1);
      expect(result.inProgressTasks).toBe(1);
      expect(result.pendingTasks).toBe(1);
      expect(result.blockedTasks).toBe(1);
      expect(result.completionRate).toBe(25); // 1/4 = 25%
      expect(result.hasBlocker).toBe(true);
      expect(result.hasSyncedTasks).toBe(true);
      expect(result.phases).toHaveLength(2);
    });

    it('无任务时返回零值', async () => {
      prisma.executionTask.findMany.mockResolvedValue([]);

      const result = await service.getProgress('goal-1', 'user-1');

      expect(result.totalTasks).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.hasBlocker).toBe(false);
      expect(result.hasSyncedTasks).toBe(false);
    });
  });
});

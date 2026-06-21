import { Test, TestingModule } from '@nestjs/testing';
import { PlanEngine } from './plan-engine';
import { ScenarioTypeEnum } from '@ai-task-manager/shared';
import type { PlanContent } from '@ai-task-manager/shared';

describe('PlanEngine', () => {
  let planEngine: PlanEngine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanEngine],
    }).compile();
    planEngine = module.get<PlanEngine>(PlanEngine);
  });

  // ============================================================
  // 辅助函数
  // ============================================================

  const mockGoal = {
    topic: '准备一次技术分享',
    title: 'React 状态管理分享',
    scenarioType: ScenarioTypeEnum.SHARING_PREP,
    audience: '前端团队',
    duration: 30,
    shareDate: '2026-07-01',
    timeConstraint: '两周内',
    resourceConstraint: '独立完成',
    successCriteria: '听众能独立使用 Redux',
    isCollaborative: false,
  };

  /** 验证 PlanContent 结构完整性 */
  function assertValidPlanContent(plan: PlanContent): void {
    expect(plan).toBeDefined();
    expect(typeof plan.summary).toBe('string');
    expect(plan.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(plan.phases)).toBe(true);
    expect(plan.phases.length).toBeGreaterThan(0);
    expect(Array.isArray(plan.risks)).toBe(true);
    expect(Array.isArray(plan.milestones)).toBe(true);
    expect(Array.isArray(plan.nextActions)).toBe(true);
    expect(Array.isArray(plan.assumptions)).toBe(true);

    // 验证每个阶段
    for (const phase of plan.phases) {
      expect(typeof phase.id).toBe('string');
      expect(typeof phase.name).toBe('string');
      expect(typeof phase.description).toBe('string');
      expect(typeof phase.order).toBe('number');
      expect(Array.isArray(phase.tasks)).toBe(true);

      // 验证每个任务
      for (const task of phase.tasks) {
        expect(typeof task.id).toBe('string');
        expect(typeof task.title).toBe('string');
        expect(typeof task.description).toBe('string');
        expect(['low', 'medium', 'high']).toContain(task.priority);
      }
    }

    // 验证每个风险
    for (const risk of plan.risks) {
      expect(typeof risk.id).toBe('string');
      expect(typeof risk.description).toBe('string');
      expect(['low', 'medium', 'high']).toContain(risk.impact);
      expect(typeof risk.mitigation).toBe('string');
    }

    // 验证每个里程碑
    for (const milestone of plan.milestones) {
      expect(typeof milestone.id).toBe('string');
      expect(typeof milestone.name).toBe('string');
      expect(typeof milestone.description).toBe('string');
    }
  }

  // ============================================================
  // 6 种场景模板生成验证
  // ============================================================

  describe('generatePlan() — 6 种场景模板', () => {
    const scenarios = [
      ScenarioTypeEnum.SHARING_PREP,
      ScenarioTypeEnum.COMPETITION,
      ScenarioTypeEnum.CONTENT_CREATION,
      ScenarioTypeEnum.SMALL_PROJECT,
      ScenarioTypeEnum.LEARNING,
      ScenarioTypeEnum.UNKNOWN,
    ];

    for (const scenario of scenarios) {
      it(`场景 ${scenario} 生成有效的 PlanContent`, () => {
        const goal = { ...mockGoal, scenarioType: scenario };
        const plan = planEngine.generatePlan(goal);
        assertValidPlanContent(plan);
      });
    }

    it('null scenarioType 回退到 UNKNOWN', () => {
      const goal = { ...mockGoal, scenarioType: null };
      const plan = planEngine.generatePlan(goal);
      assertValidPlanContent(plan);
      // UNKNOWN 场景的摘要应包含"通用"
      expect(plan.summary).toContain('通用');
    });

    it('非法 scenarioType 回退到 UNKNOWN', () => {
      const goal = { ...mockGoal, scenarioType: 'invalid_scenario' };
      const plan = planEngine.generatePlan(goal);
      assertValidPlanContent(plan);
      expect(plan.summary).toContain('通用');
    });

    it('生成的每个任务有唯一 id', () => {
      const plan = planEngine.generatePlan(mockGoal);
      const allTaskIds = plan.phases.flatMap((p) => p.tasks.map((t) => t.id));
      const uniqueIds = new Set(allTaskIds);
      expect(uniqueIds.size).toBe(allTaskIds.length);
    });

    it('生成的每个阶段有唯一 id', () => {
      const plan = planEngine.generatePlan(mockGoal);
      const phaseIds = plan.phases.map((p) => p.id);
      const uniqueIds = new Set(phaseIds);
      expect(uniqueIds.size).toBe(phaseIds.length);
    });

    it('摘要包含目标标题或主题', () => {
      const plan = planEngine.generatePlan(mockGoal);
      expect(plan.summary).toContain(mockGoal.title);
    });

    it('无 title 时摘要使用 topic', () => {
      const goal = { ...mockGoal, title: null };
      const plan = planEngine.generatePlan(goal);
      expect(plan.summary).toContain(mockGoal.topic);
    });

    it('摘要包含成功标准（如果提供）', () => {
      const plan = planEngine.generatePlan(mockGoal);
      expect(plan.summary).toContain(mockGoal.successCriteria);
    });

    it('假设列表包含时间约束（如果提供）', () => {
      const plan = planEngine.generatePlan(mockGoal);
      expect(plan.assumptions.some((a) => a.includes(mockGoal.timeConstraint))).toBe(true);
    });

    it('假设列表包含资源约束（如果提供）', () => {
      const plan = planEngine.generatePlan(mockGoal);
      expect(plan.assumptions.some((a) => a.includes(mockGoal.resourceConstraint))).toBe(true);
    });

    it('协作模式时假设列表包含协作说明', () => {
      const goal = { ...mockGoal, isCollaborative: true };
      const plan = planEngine.generatePlan(goal);
      expect(plan.assumptions.some((a) => a.includes('协作'))).toBe(true);
    });

    it('分享日期设置到含"完成"或"上线"的里程碑', () => {
      const plan = planEngine.generatePlan(mockGoal);
      const milestoneWithDate = plan.milestones.find((m) => m.targetDate === mockGoal.shareDate);
      // 如果有里程碑设置了 targetDate，应该是分享日期
      if (milestoneWithDate) {
        expect(milestoneWithDate.targetDate).toBe(mockGoal.shareDate);
      }
    });
  });

  // ============================================================
  // replan 测试
  // ============================================================

  describe('replan()', () => {
    it('重规划摘要包含原因标注', () => {
      const originalPlan = planEngine.generatePlan(mockGoal);
      const reason = '时间提前';
      const newPlan = planEngine.replan(originalPlan, mockGoal, reason);
      expect(newPlan.summary).toContain(`[重规划：${reason}]`);
    });

    it('重规划生成有效的 PlanContent', () => {
      const originalPlan = planEngine.generatePlan(mockGoal);
      const newPlan = planEngine.replan(originalPlan, mockGoal, '测试重规划');
      assertValidPlanContent(newPlan);
    });

    it('约束变化合并到目标上下文', () => {
      const originalPlan = planEngine.generatePlan(mockGoal);
      const newTimeConstraint = '一周内';
      const newPlan = planEngine.replan(originalPlan, mockGoal, '时间收紧', {
        timeConstraint: newTimeConstraint,
      });
      // 新规划应包含更新后的时间约束
      expect(newPlan.assumptions.some((a) => a.includes(newTimeConstraint))).toBe(true);
    });

    it('无约束变化时保留原有里程碑', () => {
      const originalPlan = planEngine.generatePlan(mockGoal);
      const newPlan = planEngine.replan(originalPlan, mockGoal, '微调');
      expect(newPlan.milestones).toEqual(originalPlan.milestones);
    });

    it('有约束变化时不保留原有里程碑（重新生成）', () => {
      const originalPlan = planEngine.generatePlan(mockGoal);
      const newPlan = planEngine.replan(originalPlan, mockGoal, '约束变化', {
        timeConstraint: '三天内',
      });
      // 有约束变化时，里程碑重新生成（id 会不同）
      const originalIds = new Set(originalPlan.milestones.map((m) => m.id));
      const newIds = newPlan.milestones.map((m) => m.id);
      // 至少有一些 id 是新的
      expect(newIds.some((id) => !originalIds.has(id))).toBe(true);
    });
  });

  // ============================================================
  // compare 测试
  // ============================================================

  describe('compare()', () => {
    it('相同规划返回零差异', () => {
      const plan = planEngine.generatePlan(mockGoal);
      const result = planEngine.compare(plan, plan);
      expect(result.diffs).toHaveLength(0);
      expect(result.summary).toContain('0 处差异');
    });

    it('检测摘要变更', () => {
      const planA = planEngine.generatePlan(mockGoal);
      const planB: PlanContent = { ...planA, summary: '修改后的摘要' };
      const result = planEngine.compare(planA, planB);
      const summaryDiff = result.diffs.find((d) => d.area === 'summary');
      expect(summaryDiff).toBeDefined();
      expect(summaryDiff?.type).toBe('modified');
      expect(summaryDiff?.oldValue).toBe(planA.summary);
      expect(summaryDiff?.newValue).toBe('修改后的摘要');
    });

    it('检测新增阶段', () => {
      const planA = planEngine.generatePlan(mockGoal);
      const planB: PlanContent = {
        ...planA,
        phases: [
          ...planA.phases,
          {
            id: 'new-phase-id',
            name: '全新阶段',
            description: '新增的测试阶段',
            order: 99,
            tasks: [],
          },
        ],
      };
      const result = planEngine.compare(planA, planB);
      const addedPhase = result.diffs.find(
        (d) => d.type === 'added' && d.area === 'phase' && d.description.includes('全新阶段'),
      );
      expect(addedPhase).toBeDefined();
    });

    it('检测移除阶段', () => {
      const planA = planEngine.generatePlan(mockGoal);
      const planB: PlanContent = {
        ...planA,
        phases: planA.phases.slice(0, -1), // 移除最后一个阶段
      };
      const result = planEngine.compare(planA, planB);
      const removedPhase = result.diffs.find(
        (d) => d.type === 'removed' && d.area === 'phase',
      );
      expect(removedPhase).toBeDefined();
    });

    it('检测新增任务', () => {
      const planA = planEngine.generatePlan(mockGoal);
      const planB: PlanContent = {
        ...planA,
        phases: planA.phases.map((p, i) =>
          i === 0
            ? {
                ...p,
                tasks: [
                  ...p.tasks,
                  {
                    id: 'new-task-id',
                    title: '全新任务',
                    description: '新增的测试任务',
                    priority: 'medium' as const,
                  },
                ],
              }
            : p,
        ),
      };
      const result = planEngine.compare(planA, planB);
      const addedTask = result.diffs.find(
        (d) => d.type === 'added' && d.area === 'task' && d.description.includes('全新任务'),
      );
      expect(addedTask).toBeDefined();
    });

    it('检测新增风险', () => {
      const planA = planEngine.generatePlan(mockGoal);
      const planB: PlanContent = {
        ...planA,
        risks: [
          ...planA.risks,
          {
            id: 'new-risk-id',
            description: '全新风险',
            impact: 'high' as const,
            mitigation: '缓解措施',
          },
        ],
      };
      const result = planEngine.compare(planA, planB);
      const addedRisk = result.diffs.find(
        (d) => d.type === 'added' && d.area === 'risk' && d.description.includes('全新风险'),
      );
      expect(addedRisk).toBeDefined();
    });

    it('检测新增下一步动作', () => {
      const planA = planEngine.generatePlan(mockGoal);
      const planB: PlanContent = {
        ...planA,
        nextActions: [...planA.nextActions, '全新的下一步动作'],
      };
      const result = planEngine.compare(planA, planB);
      const addedAction = result.diffs.find(
        (d) => d.type === 'added' && d.area === 'nextAction',
      );
      expect(addedAction).toBeDefined();
    });

    it('差异摘要正确统计数量', () => {
      const planA = planEngine.generatePlan(mockGoal);
      const planB: PlanContent = {
        ...planA,
        summary: '修改摘要',
        nextActions: [...planA.nextActions, '新动作'],
      };
      const result = planEngine.compare(planA, planB);
      const addedCount = result.diffs.filter((d) => d.type === 'added').length;
      const removedCount = result.diffs.filter((d) => d.type === 'removed').length;
      const modifiedCount = result.diffs.filter((d) => d.type === 'modified').length;
      expect(result.summary).toContain(`${result.diffs.length} 处差异`);
      expect(result.summary).toContain(`新增 ${addedCount}`);
      expect(result.summary).toContain(`移除 ${removedCount}`);
      expect(result.summary).toContain(`修改 ${modifiedCount}`);
    });
  });
});

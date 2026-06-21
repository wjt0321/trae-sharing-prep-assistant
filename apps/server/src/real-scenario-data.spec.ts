import { buildRealScenarioDataset } from './seed/real-scenario-data';

describe('buildRealScenarioDataset', () => {
  it('returns three scenario workspaces with linked goals', () => {
    const dataset = buildRealScenarioDataset();

    expect(dataset.workspaces.map((workspace) => workspace.id)).toEqual(
      expect.arrayContaining([
        'real-workspace-competition',
        'real-workspace-sharing',
        'real-workspace-content',
      ]),
    );

    expect(dataset.goals.filter((goal) => goal.workspaceId === 'real-workspace-competition')).toHaveLength(3);
    expect(dataset.goals.filter((goal) => goal.workspaceId === 'real-workspace-sharing')).toHaveLength(2);
    expect(dataset.goals.filter((goal) => goal.workspaceId === 'real-workspace-content')).toHaveLength(2);
  });

  it('provides active plan content with phases, risks, milestones and next actions', () => {
    const dataset = buildRealScenarioDataset();
    const activePlan = dataset.plans.find(
      (plan) => plan.goalId === 'real-goal-competition-release' && plan.isActive,
    );

    expect(activePlan).toBeDefined();

    const content = JSON.parse(activePlan!.content) as {
      summary: string;
      phases: Array<{ id: string; name: string; tasks: Array<{ id: string; title: string }> }>;
      risks: Array<{ id: string; description: string }>;
      milestones: Array<{ id: string; name: string }>;
      nextActions: string[];
      assumptions: string[];
    };

    expect(content.summary).toContain('比赛');
    expect(content.phases.length).toBeGreaterThanOrEqual(3);
    expect(content.phases[0].tasks.length).toBeGreaterThan(0);
    expect(content.risks.length).toBeGreaterThan(0);
    expect(content.milestones.length).toBeGreaterThan(0);
    expect(content.nextActions.length).toBeGreaterThan(0);
    expect(content.assumptions.length).toBeGreaterThan(0);
  });

  it('includes exports, assets and notifications needed for functional walkthroughs', () => {
    const dataset = buildRealScenarioDataset();

    expect(
      dataset.exports.some(
        (record) =>
          record.goalId === 'real-goal-competition-release' &&
          record.shareToken === 'share-real-competition-release',
      ),
    ).toBe(true);

    expect(
      dataset.assets.some(
        (asset) =>
          asset.workspaceId === 'real-workspace-sharing' && asset.type === 'checklist',
      ),
    ).toBe(true);

    expect(
      dataset.notifications.some(
        (notification) =>
          notification.workspaceId === 'real-workspace-competition' &&
          notification.type === 'task_blocked',
      ),
    ).toBe(true);
  });
});

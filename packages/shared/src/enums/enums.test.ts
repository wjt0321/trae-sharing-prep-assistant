/**
 * 枚举值快照测试
 * 确保枚举值与后端 Prisma schema 的 String 值一致
 */
import { describe, it, expect } from 'vitest';
import {
  RoleEnum,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  WorkspaceTypeEnum,
  WORKSPACE_TYPE_LABELS,
  TaskStatusEnum,
  TASK_STATUS_LABELS,
  TASK_STATUS_TRANSITIONS,
  TASK_TERMINAL_STATUSES,
  AiTaskStatusEnum,
  AI_TASK_STATUS_LABELS,
  AI_TASK_TERMINAL_STATES,
  isTerminalAiTaskStatus,
  JobTypeEnum,
  JOB_TYPE_LABELS,
  GoalTypeEnum,
  GOAL_TYPE_LABELS,
  ScenarioTypeEnum,
  SCENARIO_TYPE_LABELS,
  SCENARIO_FIELD_HINTS,
  GoalPriorityEnum,
  GOAL_PRIORITY_LABELS,
  GoalStageEnum,
  GOAL_STAGE_LABELS,
  ModuleNameEnum,
  ALL_MODULE_NAMES,
} from '../index.js';

describe('RoleEnum', () => {
  it('枚举值应为小写字符串', () => {
    expect(RoleEnum.OWNER).toBe('owner');
    expect(RoleEnum.ADMIN).toBe('admin');
    expect(RoleEnum.EDITOR).toBe('editor');
    expect(RoleEnum.VIEWER).toBe('viewer');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const role of Object.values(RoleEnum)) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe('string');
    }
  });

  it('权限矩阵覆盖所有角色', () => {
    for (const role of Object.values(RoleEnum)) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(ROLE_PERMISSIONS[role]).toHaveProperty('canView');
      expect(ROLE_PERMISSIONS[role]).toHaveProperty('canEdit');
      expect(ROLE_PERMISSIONS[role]).toHaveProperty('canShare');
      expect(ROLE_PERMISSIONS[role]).toHaveProperty('canExport');
      expect(ROLE_PERMISSIONS[role]).toHaveProperty('canManageMembers');
      expect(ROLE_PERMISSIONS[role]).toHaveProperty('canDelete');
    }
  });

  it('OWNER 拥有全部权限', () => {
    const perms = ROLE_PERMISSIONS[RoleEnum.OWNER];
    expect(perms.canView).toBe(true);
    expect(perms.canEdit).toBe(true);
    expect(perms.canShare).toBe(true);
    expect(perms.canExport).toBe(true);
    expect(perms.canManageMembers).toBe(true);
    expect(perms.canDelete).toBe(true);
  });

  it('VIEWER 只能查看', () => {
    const perms = ROLE_PERMISSIONS[RoleEnum.VIEWER];
    expect(perms.canView).toBe(true);
    expect(perms.canEdit).toBe(false);
    expect(perms.canShare).toBe(false);
    expect(perms.canExport).toBe(false);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canDelete).toBe(false);
  });
});

describe('WorkspaceTypeEnum', () => {
  it('枚举值应为小写字符串', () => {
    expect(WorkspaceTypeEnum.PERSONAL).toBe('personal');
    expect(WorkspaceTypeEnum.TEAM).toBe('team');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const type of Object.values(WorkspaceTypeEnum)) {
      expect(WORKSPACE_TYPE_LABELS[type]).toBeDefined();
    }
  });
});

describe('TaskStatusEnum', () => {
  it('枚举值应为小写下划线字符串', () => {
    expect(TaskStatusEnum.PENDING).toBe('pending');
    expect(TaskStatusEnum.IN_PROGRESS).toBe('in_progress');
    expect(TaskStatusEnum.COMPLETED).toBe('completed');
    expect(TaskStatusEnum.CANCELLED).toBe('cancelled');
    expect(TaskStatusEnum.BLOCKED).toBe('blocked');
    expect(TaskStatusEnum.SKIPPED).toBe('skipped');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const status of Object.values(TaskStatusEnum)) {
      expect(TASK_STATUS_LABELS[status]).toBeDefined();
    }
  });

  it('状态机覆盖所有状态', () => {
    for (const status of Object.values(TaskStatusEnum)) {
      expect(TASK_STATUS_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(TASK_STATUS_TRANSITIONS[status])).toBe(true);
    }
  });

  it('CANCELLED 是终态，无后续流转', () => {
    expect(TASK_STATUS_TRANSITIONS[TaskStatusEnum.CANCELLED]).toEqual([]);
    expect(TASK_TERMINAL_STATUSES).toContain(TaskStatusEnum.CANCELLED);
  });

  it('PENDING 可流转到所有非终态状态', () => {
    const transitions = TASK_STATUS_TRANSITIONS[TaskStatusEnum.PENDING];
    expect(transitions).toContain(TaskStatusEnum.IN_PROGRESS);
    expect(transitions).toContain(TaskStatusEnum.COMPLETED);
    expect(transitions).toContain(TaskStatusEnum.BLOCKED);
    expect(transitions).toContain(TaskStatusEnum.CANCELLED);
    expect(transitions).toContain(TaskStatusEnum.SKIPPED);
  });
});

describe('AiTaskStatusEnum', () => {
  it('枚举值应为小写字符串', () => {
    expect(AiTaskStatusEnum.QUEUED).toBe('queued');
    expect(AiTaskStatusEnum.RUNNING).toBe('running');
    expect(AiTaskStatusEnum.SUCCEEDED).toBe('succeeded');
    expect(AiTaskStatusEnum.FAILED).toBe('failed');
    expect(AiTaskStatusEnum.CANCELLED).toBe('cancelled');
    expect(AiTaskStatusEnum.TIMEOUT).toBe('timeout');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const status of Object.values(AiTaskStatusEnum)) {
      expect(AI_TASK_STATUS_LABELS[status]).toBeDefined();
    }
  });

  it('终态列表包含 SUCCEEDED/FAILED/CANCELLED/TIMEOUT', () => {
    expect(AI_TASK_TERMINAL_STATES).toContain(AiTaskStatusEnum.SUCCEEDED);
    expect(AI_TASK_TERMINAL_STATES).toContain(AiTaskStatusEnum.FAILED);
    expect(AI_TASK_TERMINAL_STATES).toContain(AiTaskStatusEnum.CANCELLED);
    expect(AI_TASK_TERMINAL_STATES).toContain(AiTaskStatusEnum.TIMEOUT);
  });

  it('isTerminalAiTaskStatus 正确识别终态', () => {
    expect(isTerminalAiTaskStatus(AiTaskStatusEnum.SUCCEEDED)).toBe(true);
    expect(isTerminalAiTaskStatus(AiTaskStatusEnum.FAILED)).toBe(true);
    expect(isTerminalAiTaskStatus(AiTaskStatusEnum.QUEUED)).toBe(false);
    expect(isTerminalAiTaskStatus(AiTaskStatusEnum.RUNNING)).toBe(false);
  });
});

describe('JobTypeEnum', () => {
  it('枚举值应为小写下划线字符串', () => {
    expect(JobTypeEnum.PLAN_GENERATION).toBe('plan_generation');
    expect(JobTypeEnum.REPLAN).toBe('replan');
    expect(JobTypeEnum.EXPORT).toBe('export');
    expect(JobTypeEnum.NOTIFICATION).toBe('notification');
    expect(JobTypeEnum.AI_CALL).toBe('ai_call');
    expect(JobTypeEnum.KNOWLEDGE_INDEX).toBe('knowledge_index');
    expect(JobTypeEnum.CLEANUP).toBe('cleanup');
    expect(JobTypeEnum.SESSION_CLEANUP).toBe('session_cleanup');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const type of Object.values(JobTypeEnum)) {
      expect(JOB_TYPE_LABELS[type]).toBeDefined();
    }
  });
});

describe('GoalTypeEnum', () => {
  it('枚举值应为小写字符串', () => {
    expect(GoalTypeEnum.INFORM).toBe('inform');
    expect(GoalTypeEnum.PERSUADE).toBe('persuade');
    expect(GoalTypeEnum.TEACH).toBe('teach');
    expect(GoalTypeEnum.REVIEW).toBe('review');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const type of Object.values(GoalTypeEnum)) {
      expect(GOAL_TYPE_LABELS[type]).toBeDefined();
    }
  });
});

describe('ScenarioTypeEnum', () => {
  it('枚举值应为小写下划线字符串', () => {
    expect(ScenarioTypeEnum.SHARING_PREP).toBe('sharing_prep');
    expect(ScenarioTypeEnum.COMPETITION).toBe('competition');
    expect(ScenarioTypeEnum.CONTENT_CREATION).toBe('content_creation');
    expect(ScenarioTypeEnum.SMALL_PROJECT).toBe('small_project');
    expect(ScenarioTypeEnum.LEARNING).toBe('learning');
    expect(ScenarioTypeEnum.UNKNOWN).toBe('unknown');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const scenario of Object.values(ScenarioTypeEnum)) {
      expect(SCENARIO_TYPE_LABELS[scenario]).toBeDefined();
    }
  });

  it('每个场景都有字段提示数组', () => {
    for (const scenario of Object.values(ScenarioTypeEnum)) {
      expect(SCENARIO_FIELD_HINTS[scenario]).toBeDefined();
      expect(Array.isArray(SCENARIO_FIELD_HINTS[scenario])).toBe(true);
      expect(SCENARIO_FIELD_HINTS[scenario].length).toBeGreaterThan(0);
    }
  });
});

describe('GoalPriorityEnum', () => {
  it('枚举值应为小写字符串', () => {
    expect(GoalPriorityEnum.LOW).toBe('low');
    expect(GoalPriorityEnum.MEDIUM).toBe('medium');
    expect(GoalPriorityEnum.HIGH).toBe('high');
    expect(GoalPriorityEnum.URGENT).toBe('urgent');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const priority of Object.values(GoalPriorityEnum)) {
      expect(GOAL_PRIORITY_LABELS[priority]).toBeDefined();
    }
  });
});

describe('GoalStageEnum', () => {
  it('枚举值应为小写字符串', () => {
    expect(GoalStageEnum.INSPIRATION).toBe('inspiration');
    expect(GoalStageEnum.CONTEXT).toBe('context');
    expect(GoalStageEnum.PLANNING).toBe('planning');
    expect(GoalStageEnum.EXECUTING).toBe('executing');
    expect(GoalStageEnum.DONE).toBe('done');
    expect(GoalStageEnum.ARCHIVED).toBe('archived');
  });

  it('每个枚举值都有对应的中文标签', () => {
    for (const stage of Object.values(GoalStageEnum)) {
      expect(GOAL_STAGE_LABELS[stage]).toBeDefined();
    }
  });
});

describe('ModuleNameEnum', () => {
  it('枚举值应为小写字符串', () => {
    expect(ModuleNameEnum.AUTH).toBe('auth');
    expect(ModuleNameEnum.WORKSPACE).toBe('workspace');
    expect(ModuleNameEnum.GOAL).toBe('goal');
    expect(ModuleNameEnum.PLANNING).toBe('planning');
    expect(ModuleNameEnum.EXECUTION).toBe('execution');
    expect(ModuleNameEnum.KNOWLEDGE).toBe('knowledge');
    expect(ModuleNameEnum.COLLABORATION).toBe('collaboration');
    expect(ModuleNameEnum.EXPORT).toBe('export');
    expect(ModuleNameEnum.INTEGRATION).toBe('integration');
  });

  it('ALL_MODULE_NAMES 包含所有模块', () => {
    const allValues = Object.values(ModuleNameEnum);
    expect(ALL_MODULE_NAMES).toEqual(allValues);
  });
});

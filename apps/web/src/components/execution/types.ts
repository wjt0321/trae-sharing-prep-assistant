import type {
  TaskResponseDto,
  GoalProgressDto,
  NextStepsResponseDto,
  NextStepSuggestionDto,
  SyncTasksResponseDto,
  PlanResponseDto,
} from "@ai-task-manager/shared";

// ============================================================
// 执行工作台共享类型
// ============================================================

export interface GoalBrief {
  id: string;
  workspaceId: string;
  topic: string;
  title: string | null;
  scenarioType: string | null;
  currentStage: string;
  successCriteria: string | null;
}

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  role: string;
}

export interface HistoryItem {
  id: string;
  taskId: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  blockerNote: string | null;
  createdAt: string;
}

export type {
  TaskResponseDto,
  GoalProgressDto,
  NextStepsResponseDto,
  NextStepSuggestionDto,
  SyncTasksResponseDto,
  PlanResponseDto,
};

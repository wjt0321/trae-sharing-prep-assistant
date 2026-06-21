"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  TaskStatusEnum,
  GOAL_STAGE_LABELS,
  GoalStageEnum,
  type TaskResponseDto,
  type GoalProgressDto,
  type NextStepsResponseDto,
  type SyncTasksResponseDto,
  type PlanResponseDto,
} from "@ai-task-manager/shared";
import type { GoalBrief, WorkspaceMember, HistoryItem } from "@/components/execution/types";
import { TaskBoard } from "@/components/execution/TaskBoard";
import { BlockerSection } from "@/components/execution/BlockerSection";
import { NextStepsPanel } from "@/components/execution/NextStepsPanel";
import { MilestonePanel } from "@/components/execution/MilestonePanel";
import { HistoryPanel } from "@/components/execution/HistoryPanel";
import { StatusModal } from "@/components/execution/StatusModal";
import { AssignModal } from "@/components/execution/AssignModal";

// ============================================================
// 主页面
// ============================================================
export default function ExecutionPage() {
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<GoalBrief | null>(null);
  const [tasks, setTasks] = useState<TaskResponseDto[]>([]);
  const [progress, setProgress] = useState<GoalProgressDto | null>(null);
  const [nextSteps, setNextSteps] = useState<NextStepsResponseDto | null>(null);
  const [activePlan, setActivePlan] = useState<PlanResponseDto | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncTasksResponseDto | null>(null);
  const [statusModal, setStatusModal] = useState<{ task: TaskResponseDto } | null>(null);
  const [assignModal, setAssignModal] = useState<{ task: TaskResponseDto } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [goalData, tasksData, progressData, nextStepsData, planData] = await Promise.all([
        api.get<GoalBrief>(`/goals/${goalId}`),
        api.get<TaskResponseDto[]>(`/goals/${goalId}/tasks`),
        api.get<GoalProgressDto>(`/goals/${goalId}/tasks/progress`),
        api.get<NextStepsResponseDto>(`/goals/${goalId}/tasks/next-steps`),
        api.get<PlanResponseDto | null>(`/goals/${goalId}/plans/active`),
      ]);
      setGoal(goalData);
      setTasks(tasksData);
      setProgress(progressData);
      setNextSteps(nextStepsData);
      setActivePlan(planData);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  // 加载工作区成员
  useEffect(() => {
    if (goal?.workspaceId) {
      api
        .get<Array<{ userId: string; displayName: string; role: string }>>(
          `/workspaces/${goal.workspaceId}/members`,
        )
        .then((data) => {
          setMembers(
            data.map((m) => ({
              userId: m.userId,
              displayName: m.displayName,
              role: m.role,
            })),
          );
        })
        .catch(() => {});
    }
  }, [goal?.workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 加载最近状态历史（批量接口，单次请求获取所有任务的最近历史）
  useEffect(() => {
    if (tasks.length === 0) {
      setHistory([]);
      return;
    }
    api
      .get<HistoryItem[]>(`/goals/${goalId}/tasks/history/recent?limit=10`)
      .then((data) => setHistory(data))
      .catch(() => setHistory([]));
  }, [goalId, tasks.length]);

  const handleSync = async (replace: boolean) => {
    setSyncing(true);
    setError(null);
    try {
      const result = await api.post<SyncTasksResponseDto>(
        `/goals/${goalId}/tasks/sync-from-plan`,
        { replace },
      );
      setSyncResult(result);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickStatus = async (taskId: string, status: TaskStatusEnum) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "状态更新失败");
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-tertiary">加载中...</p>
      </main>
    );
  }

  if (!goal) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-danger">目标不存在或无权访问</p>
        <Link href="/app/goals">
          <Button variant="secondary" size="sm" className="mt-4">
            返回列表
          </Button>
        </Link>
      </main>
    );
  }

  const hasPlan = !!activePlan;
  const hasTasks = tasks.length > 0;
  const stageLabel = GOAL_STAGE_LABELS[goal.currentStage as GoalStageEnum] ?? goal.currentStage;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-xs text-tertiary animate-rise">
        <Link href="/app/goals" className="hover:text-accent">
          目标
        </Link>
        <span>/</span>
        <Link href={`/app/goals/${goalId}`} className="hover:text-accent">
          {goal.title || goal.topic}
        </Link>
        <span>/</span>
        <span className="text-secondary">执行工作台</span>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 顶部概览 */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-5 animate-rise">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-ink">
              {goal.title || goal.topic}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-secondary">
                {stageLabel}
              </span>
              {progress?.hasBlocker && (
                <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs text-danger">
                  存在阻塞
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/app/goals/${goalId}/plan`}>
              <Button variant="secondary" size="sm">
                查看规划
              </Button>
            </Link>
            <Link href={`/app/goals/${goalId}/exports`}>
              <Button size="sm">
                导出分享
              </Button>
            </Link>
          </div>
        </div>

        {/* 进度条 */}
        {progress && hasTasks && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-secondary">
              <span>整体进度</span>
              <span>
                {progress.completedTasks}/{progress.totalTasks} 已完成 · {progress.completionRate}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress.completionRate}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-tertiary">
              <span>进行中 {progress.inProgressTasks}</span>
              <span>待推进 {progress.pendingTasks}</span>
              <span className={progress.blockedTasks > 0 ? "text-danger" : ""}>
                受阻 {progress.blockedTasks}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 无规划 / 无任务引导 */}
      {!hasPlan && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center animate-rise">
          <h2 className="text-lg font-semibold text-ink">还没有规划</h2>
          <p className="mt-1 text-sm text-secondary">
            先生成规划，再把阶段任务同步到工作台开始推进
          </p>
          <Link href={`/app/goals/${goalId}/plan`}>
            <Button className="mt-4">去生成规划</Button>
          </Link>
        </div>
      )}

      {hasPlan && !hasTasks && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center animate-rise">
          <h2 className="text-lg font-semibold text-ink">工作台还没有任务</h2>
          <p className="mt-1 text-sm text-secondary">
            从当前规划同步阶段任务，开始推进你的目标
          </p>
          <Button
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="mt-4"
          >
            {syncing ? "同步中..." : "从规划同步任务"}
          </Button>
          {syncResult && (
            <p className="mt-3 text-xs text-success">
              已新建 {syncResult.created} 个任务
            </p>
          )}
        </div>
      )}

      {/* 工作台主体 */}
      {hasTasks && nextSteps && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 左侧：任务列表 */}
          <div className="lg:col-span-2 space-y-4">
            <TaskBoard
              tasks={tasks}
              members={members}
              onStatusChange={(task) => setStatusModal({ task })}
              onQuickComplete={(taskId) => handleQuickStatus(taskId, TaskStatusEnum.COMPLETED)}
              onQuickStart={(taskId) => handleQuickStatus(taskId, TaskStatusEnum.IN_PROGRESS)}
              onAssign={(task) => setAssignModal({ task })}
            />

            {/* 阻塞区 */}
            <BlockerSection
              tasks={tasks.filter((t) => t.status === TaskStatusEnum.BLOCKED)}
              onUnblock={(taskId) => handleQuickStatus(taskId, TaskStatusEnum.IN_PROGRESS)}
            />
          </div>

          {/* 右侧：下一步建议 + 里程碑 + 最近更新 */}
          <div className="space-y-4">
            <NextStepsPanel
              nextSteps={nextSteps}
              onTaskClick={() => {}}
            />

            {activePlan && activePlan.content.milestones.length > 0 && (
              <MilestonePanel milestones={activePlan.content.milestones} />
            )}

            {history.length > 0 && <HistoryPanel history={history} />}
          </div>
        </div>
      )}

      {/* 状态变更弹窗 */}
      {statusModal && (
        <StatusModal
          task={statusModal.task}
          onClose={() => setStatusModal(null)}
          onSuccess={() => {
            setStatusModal(null);
            loadData();
          }}
        />
      )}

      {/* 指派弹窗 */}
      {assignModal && (
        <AssignModal
          task={assignModal.task}
          members={members}
          onClose={() => setAssignModal(null)}
          onSuccess={() => {
            setAssignModal(null);
            loadData();
          }}
        />
      )}
    </main>
  );
}

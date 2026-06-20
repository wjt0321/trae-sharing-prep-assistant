"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  TaskStatusEnum,
  TASK_STATUS_LABELS,
  TASK_STATUS_TRANSITIONS,
  GOAL_STAGE_LABELS,
  GoalStageEnum,
  type TaskResponseDto,
  type GoalProgressDto,
  type NextStepsResponseDto,
  type NextStepSuggestionDto,
  type SyncTasksResponseDto,
  type PlanResponseDto,
} from "@ai-task-manager/shared";

// ============================================================
// 类型定义
// ============================================================
interface GoalBrief {
  id: string;
  topic: string;
  title: string | null;
  scenarioType: string | null;
  currentStage: string;
  successCriteria: string | null;
}

interface HistoryItem {
  id: string;
  taskId: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  blockerNote: string | null;
  createdAt: string;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncTasksResponseDto | null>(null);
  const [statusModal, setStatusModal] = useState<{ task: TaskResponseDto } | null>(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 加载最近状态历史（取所有任务的历史，最近 10 条）
  useEffect(() => {
    if (tasks.length === 0) {
      setHistory([]);
      return;
    }
    Promise.all(
      tasks.slice(0, 20).map((t) =>
        api.get<HistoryItem[]>(`/tasks/${t.id}/history`).catch(() => [] as HistoryItem[]),
      ),
    ).then((results) => {
      const all = results.flat().sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setHistory(all.slice(0, 10));
    });
  }, [tasks]);

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
              onStatusChange={(task) => setStatusModal({ task })}
              onQuickComplete={(taskId) => handleQuickStatus(taskId, TaskStatusEnum.COMPLETED)}
              onQuickStart={(taskId) => handleQuickStatus(taskId, TaskStatusEnum.IN_PROGRESS)}
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
    </main>
  );
}

// ============================================================
// 任务看板（按阶段分组）
// ============================================================
function TaskBoard({
  tasks,
  onStatusChange,
  onQuickComplete,
  onQuickStart,
}: {
  tasks: TaskResponseDto[];
  onStatusChange: (task: TaskResponseDto) => void;
  onQuickComplete: (taskId: string) => void;
  onQuickStart: (taskId: string) => void;
}) {
  // 按阶段分组
  const phaseMap = new Map<string, TaskResponseDto[]>();
  for (const t of tasks) {
    const key = t.stageId ?? "__no_stage__";
    if (!phaseMap.has(key)) phaseMap.set(key, []);
    phaseMap.get(key)!.push(t);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-tertiary">
          任务列表（{tasks.length}）
        </h2>
      </div>

      <div className="mt-4 space-y-5">
        {Array.from(phaseMap.entries()).map(([key, phaseTasks]) => (
          <div key={key}>
            <div className="flex items-center gap-2 border-l-2 border-accent/30 pl-3">
              <h3 className="text-sm font-semibold text-ink">
                {phaseTasks[0].stageName ?? "未分组"}
              </h3>
              <span className="text-[10px] text-tertiary">
                {phaseTasks.filter((t) => t.status === TaskStatusEnum.COMPLETED).length}/
                {phaseTasks.length}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {phaseTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={() => onStatusChange(task)}
                  onQuickComplete={() => onQuickComplete(task.id)}
                  onQuickStart={() => onQuickStart(task.id)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onStatusChange,
  onQuickComplete,
  onQuickStart,
}: {
  task: TaskResponseDto;
  onStatusChange: () => void;
  onQuickComplete: () => void;
  onQuickStart: () => void;
}) {
  const isCompleted = task.status === TaskStatusEnum.COMPLETED;
  const isBlocked = task.status === TaskStatusEnum.BLOCKED;
  const isInProgress = task.status === TaskStatusEnum.IN_PROGRESS;

  return (
    <li className="group flex items-start gap-2.5 rounded-lg border border-border/60 px-3 py-2 hover:border-border hover:bg-muted/30 transition-colors">
      {/* 状态切换按钮 */}
      <button
        onClick={() => {
          if (isCompleted) {
            onStatusChange();
          } else if (isInProgress) {
            onQuickComplete();
          } else {
            onQuickStart();
          }
        }}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          isCompleted
            ? "border-success bg-success text-white"
            : isInProgress
            ? "border-accent bg-accent/10"
            : isBlocked
            ? "border-danger bg-danger/10"
            : "border-tertiary hover:border-accent"
        }`}
        title={TASK_STATUS_LABELS[task.status]}
      >
        {isCompleted && <span className="text-[10px]">✓</span>}
        {isInProgress && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        {isBlocked && <span className="text-[10px] text-danger">!</span>}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              isCompleted ? "text-tertiary line-through" : "text-ink"
            }`}
          >
            {task.title}
          </span>
          <StatusBadge status={task.status} />
        </div>
        {task.description && (
          <p className="mt-0.5 text-xs text-secondary">{task.description}</p>
        )}
        {isBlocked && task.blockerNote && (
          <p className="mt-1 rounded bg-danger/5 px-2 py-1 text-xs text-danger">
            阻塞：{task.blockerNote}
          </p>
        )}
        {task.dueDate && (
          <p className="mt-0.5 text-[10px] text-tertiary">
            截止 {task.dueDate.split("T")[0]}
          </p>
        )}
      </div>

      {/* 操作按钮 */}
      <button
        onClick={onStatusChange}
        className="shrink-0 text-[11px] text-tertiary opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
      >
        变更
      </button>
    </li>
  );
}

function StatusBadge({ status }: { status: TaskStatusEnum }) {
  const styles: Record<TaskStatusEnum, string> = {
    [TaskStatusEnum.PENDING]: "bg-muted text-secondary",
    [TaskStatusEnum.IN_PROGRESS]: "bg-accent/10 text-accent",
    [TaskStatusEnum.COMPLETED]: "bg-success/10 text-success",
    [TaskStatusEnum.BLOCKED]: "bg-danger/10 text-danger",
    [TaskStatusEnum.CANCELLED]: "bg-muted text-tertiary",
    [TaskStatusEnum.SKIPPED]: "bg-muted text-tertiary",
  };
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${styles[status]}`}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

// ============================================================
// 阻塞区
// ============================================================
function BlockerSection({
  tasks,
  onUnblock,
}: {
  tasks: TaskResponseDto[];
  onUnblock: (taskId: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-5 animate-rise">
      <h2 className="flex items-center gap-2 text-sm font-medium text-danger">
        <span>⚠</span>
        阻塞区（{tasks.length}）
      </h2>
      <ul className="mt-3 space-y-2">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-start justify-between gap-2 rounded-lg bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm text-ink">{t.title}</p>
              {t.blockerNote && (
                <p className="mt-0.5 text-xs text-danger">{t.blockerNote}</p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onUnblock(t.id)}
              className="shrink-0"
            >
              解除
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// 下一步建议面板（视觉收口点）
// ============================================================
function NextStepsPanel({
  nextSteps,
  onTaskClick,
}: {
  nextSteps: NextStepsResponseDto;
  onTaskClick: (taskId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 animate-rise">
      <h2 className="text-sm font-semibold text-accent">下一步建议</h2>

      {nextSteps.recommendReplan && (
        <div className="mt-3 rounded-lg border border-danger/30 bg-surface px-3 py-2">
          <p className="text-xs font-medium text-danger">建议重规划</p>
          <p className="mt-0.5 text-xs text-secondary">
            {nextSteps.replanReason}
          </p>
        </div>
      )}

      {nextSteps.todayActions.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium text-tertiary">今日行动</p>
          <ul className="mt-1.5 space-y-1">
            {nextSteps.todayActions.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 text-xs text-ink"
              >
                <span className="h-1 w-1 rounded-full bg-accent" />
                <button
                  onClick={() => onTaskClick(t.id)}
                  className="text-left hover:text-accent"
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextSteps.suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {nextSteps.suggestions.map((s, i) => (
            <SuggestionItem key={i} suggestion={s} />
          ))}
        </ul>
      )}

      {nextSteps.suggestions.length === 0 && nextSteps.todayActions.length === 0 && (
        <p className="mt-3 text-xs text-secondary">
          暂无建议，继续推进你的任务吧
        </p>
      )}
    </div>
  );
}

function SuggestionItem({ suggestion }: { suggestion: NextStepSuggestionDto }) {
  const typeStyles = {
    action: "text-accent",
    risk: "text-warning",
    replan: "text-danger",
  };
  const priorityLabel = {
    high: "高",
    medium: "中",
    low: "低",
  };
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 text-xs ${typeStyles[suggestion.type]}`}>
        {suggestion.type === "risk" ? "⚠" : suggestion.type === "replan" ? "↻" : "→"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink">{suggestion.content}</p>
        <span className="text-[10px] text-tertiary">
          优先级：{priorityLabel[suggestion.priority]}
        </span>
      </div>
    </li>
  );
}

// ============================================================
// 里程碑面板
// ============================================================
function MilestonePanel({
  milestones,
}: {
  milestones: Array<{
    id: string;
    name: string;
    description: string;
    targetDate?: string;
  }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
      <h2 className="text-sm font-medium text-tertiary">
        里程碑（{milestones.length}）
      </h2>
      <ul className="mt-3 space-y-2">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-start gap-2">
            <span className="mt-0.5 text-success">◆</span>
            <div>
              <p className="text-sm text-ink">{m.name}</p>
              {m.description && (
                <p className="text-xs text-secondary">{m.description}</p>
              )}
              {m.targetDate && (
                <p className="text-[10px] text-tertiary">
                  目标：{m.targetDate.split("T")[0]}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// 最近更新面板
// ============================================================
function HistoryPanel({ history }: { history: HistoryItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
      <h2 className="text-sm font-medium text-tertiary">最近更新</h2>
      <ul className="mt-3 space-y-2">
        {history.map((h) => (
          <li key={h.id} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 text-tertiary">
              {new Date(h.createdAt).toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-secondary">
              {h.fromStatus
                ? `${TASK_STATUS_LABELS[h.fromStatus as TaskStatusEnum]} → ${TASK_STATUS_LABELS[h.toStatus as TaskStatusEnum]}`
                : `创建为 ${TASK_STATUS_LABELS[h.toStatus as TaskStatusEnum]}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// 状态变更弹窗
// ============================================================
function StatusModal({
  task,
  onClose,
  onSuccess,
}: {
  task: TaskResponseDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<TaskStatusEnum>(task.status);
  const [blockerNote, setBlockerNote] = useState(task.blockerNote ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = TASK_STATUS_TRANSITIONS[task.status] ?? [];
  const needBlockerNote = status === TaskStatusEnum.BLOCKED;

  const handleSubmit = async () => {
    if (needBlockerNote && !blockerNote.trim()) {
      setError("请填写阻塞原因");
      return;
    }
    if (status === task.status && !needBlockerNote) {
      onClose();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/tasks/${task.id}/status`, {
        status,
        blockerNote: needBlockerNote ? blockerNote : undefined,
        note: note || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg animate-rise">
        <h2 className="text-lg font-semibold text-ink">变更任务状态</h2>
        <p className="mt-1 text-xs text-tertiary">{task.title}</p>

        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium text-secondary">
            当前状态：{TASK_STATUS_LABELS[task.status]}
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.values(TaskStatusEnum) as TaskStatusEnum[]).map((s) => {
              const isAllowed = allowed.includes(s) || s === task.status;
              const isSelected = s === status;
              return (
                <button
                  key={s}
                  disabled={!isAllowed}
                  onClick={() => setStatus(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? "border-accent bg-accent/10 text-accent"
                      : isAllowed
                      ? "border-border bg-surface text-secondary hover:border-accent/50"
                      : "border-border bg-muted/30 text-tertiary opacity-50 cursor-not-allowed"
                  }`}
                >
                  {TASK_STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        {needBlockerNote && (
          <div className="mt-4">
            <Input
              label="阻塞原因（必填）"
              value={blockerNote}
              onChange={(e) => setBlockerNote(e.target.value)}
              placeholder="说明受阻的具体原因"
            />
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-secondary">
            备注（可选）
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="记录这次变更的说明"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "提交中..." : "确认变更"}
          </Button>
        </div>
      </div>
    </div>
  );
}

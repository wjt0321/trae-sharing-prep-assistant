"use client";

import { TaskStatusEnum, TASK_STATUS_LABELS } from "@ai-task-manager/shared";
import type { TaskResponseDto } from "@ai-task-manager/shared";
import type { WorkspaceMember } from "./types";
import { STATUS_STYLE_MAP, STATUS_DOT_STYLE_MAP } from "@/lib/task-constants";

// ============================================================
// 任务看板（按阶段分组）
// ============================================================
export function TaskBoard({
  tasks,
  members,
  onStatusChange,
  onQuickComplete,
  onQuickStart,
  onAssign,
}: {
  tasks: TaskResponseDto[];
  members: WorkspaceMember[];
  onStatusChange: (task: TaskResponseDto) => void;
  onQuickComplete: (taskId: string) => void;
  onQuickStart: (taskId: string) => void;
  onAssign: (task: TaskResponseDto) => void;
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
                  members={members}
                  onStatusChange={() => onStatusChange(task)}
                  onQuickComplete={() => onQuickComplete(task.id)}
                  onQuickStart={() => onQuickStart(task.id)}
                  onAssign={() => onAssign(task)}
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
  members,
  onStatusChange,
  onQuickComplete,
  onQuickStart,
  onAssign,
}: {
  task: TaskResponseDto;
  members: WorkspaceMember[];
  onStatusChange: () => void;
  onQuickComplete: () => void;
  onQuickStart: () => void;
  onAssign: () => void;
}) {
  const isCompleted = task.status === TaskStatusEnum.COMPLETED;
  const isBlocked = task.status === TaskStatusEnum.BLOCKED;
  const isInProgress = task.status === TaskStatusEnum.IN_PROGRESS;

  const assignee = task.assigneeId
    ? members.find((m) => m.userId === task.assigneeId)
    : null;

  const dotStyle = STATUS_DOT_STYLE_MAP[task.status];

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
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${dotStyle.border}`}
        title={TASK_STATUS_LABELS[task.status]}
      >
        {isCompleted && <span className="text-[10px]">{dotStyle.icon}</span>}
        {isInProgress && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        {isBlocked && <span className="text-[10px] text-danger">{dotStyle.icon}</span>}
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

      {/* 指派人 / 指派按钮 */}
      <button
        onClick={onAssign}
        className="shrink-0"
        title={assignee ? `指派给 ${assignee.displayName}` : "指派任务"}
      >
        {assignee ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-[10px] font-medium text-accent">
            {assignee.displayName.charAt(0).toUpperCase()}
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-tertiary hover:border-accent hover:text-accent">
            +
          </span>
        )}
      </button>

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

export function StatusBadge({ status }: { status: TaskStatusEnum }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${STATUS_STYLE_MAP[status]}`}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

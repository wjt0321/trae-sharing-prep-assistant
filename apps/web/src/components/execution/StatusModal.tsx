"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  TaskStatusEnum,
  TASK_STATUS_LABELS,
  TASK_STATUS_TRANSITIONS,
  type TaskResponseDto,
} from "@ai-task-manager/shared";

// ============================================================
// 状态变更弹窗
// ============================================================
export function StatusModal({
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

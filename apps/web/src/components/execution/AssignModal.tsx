"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { TaskResponseDto } from "@ai-task-manager/shared";
import type { WorkspaceMember } from "./types";

// ============================================================
// 指派弹窗
// ============================================================
export function AssignModal({
  task,
  members,
  onClose,
  onSuccess,
}: {
  task: TaskResponseDto;
  members: WorkspaceMember[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async (assigneeId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/tasks/${task.id}/assign`, {
        assigneeId,
        note: note || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "指派失败");
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.delete(`/tasks/${task.id}/assign`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消指派失败");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg animate-rise">
        <h2 className="text-lg font-semibold text-ink">指派任务</h2>
        <p className="mt-1 text-xs text-tertiary">{task.title}</p>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-secondary">
            备注（可选）
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="给被指派人的说明"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-secondary">选择成员</p>
          {members.length === 0 ? (
            <p className="text-xs text-tertiary">工作区暂无其他成员</p>
          ) : (
            <ul className="max-h-60 space-y-1 overflow-y-auto">
              {members.map((m) => (
                <li key={m.userId}>
                  <button
                    onClick={() => handleAssign(m.userId)}
                    disabled={submitting}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                      task.assigneeId === m.userId
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
                      {m.displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{m.displayName}</p>
                      <p className="text-[10px] text-tertiary">{m.role}</p>
                    </div>
                    {task.assigneeId === m.userId && (
                      <span className="text-[10px] text-accent">当前</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {task.assigneeId && (
          <button
            onClick={handleUnassign}
            disabled={submitting}
            className="mt-3 text-xs text-danger hover:underline"
          >
            取消当前指派
          </button>
        )}

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}

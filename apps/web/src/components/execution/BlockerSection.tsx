"use client";

import type { TaskResponseDto } from "@ai-task-manager/shared";
import { Button } from "@/components/ui/Button";

// ============================================================
// 阻塞区
// ============================================================
export function BlockerSection({
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

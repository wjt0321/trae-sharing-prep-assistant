"use client";

import { TaskStatusEnum, TASK_STATUS_LABELS } from "@ai-task-manager/shared";
import type { HistoryItem } from "./types";

// ============================================================
// 最近更新面板
// ============================================================
export function HistoryPanel({ history }: { history: HistoryItem[] }) {
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

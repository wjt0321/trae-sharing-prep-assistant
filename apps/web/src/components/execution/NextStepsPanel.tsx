"use client";

import type {
  NextStepsResponseDto,
  NextStepSuggestionDto,
} from "@ai-task-manager/shared";

// ============================================================
// 下一步建议面板（视觉收口点）
// ============================================================
export function NextStepsPanel({
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

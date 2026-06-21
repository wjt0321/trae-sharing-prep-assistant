"use client";

// ============================================================
// 里程碑面板
// ============================================================
export function MilestonePanel({
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

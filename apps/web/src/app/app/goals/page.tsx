"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/lib/workspace";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  ScenarioTypeEnum,
  SCENARIO_TYPE_LABELS,
  GoalStageEnum,
  GOAL_STAGE_LABELS,
} from "@ai-task-manager/shared";

interface GoalItem {
  id: string;
  topic: string;
  title: string | null;
  scenarioType: string | null;
  currentStage: string;
  priority: string | null;
  successCriteria: string | null;
  createdAt: string;
}

const STAGE_FILTERS = [
  { value: "", label: "全部" },
  ...Object.values(GoalStageEnum).filter((s) => s !== GoalStageEnum.ARCHIVED).map((s) => ({
    value: s,
    label: GOAL_STAGE_LABELS[s],
  })),
];

export default function GoalsPage() {
  const { currentWorkspace } = useWorkspace();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("");

  useEffect(() => {
    if (!currentWorkspace) return;
    const params = new URLSearchParams({ workspaceId: currentWorkspace.id });
    if (stageFilter) params.set("currentStage", stageFilter);
    api
      .get<GoalItem[]>(`/goals?${params.toString()}`)
      .then((data) => setGoals(data))
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, [currentWorkspace, stageFilter]);

  if (!currentWorkspace) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <p className="text-sm text-tertiary">请先选择工作区</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between animate-rise">
        <div>
          <h1 className="text-2xl font-semibold text-ink">目标</h1>
          <p className="mt-1 text-sm text-secondary">
            把想法变成可推进的目标
          </p>
        </div>
        <Link href="/app/goals/new">
          <Button>创建目标</Button>
        </Link>
      </div>

      {/* 阶段筛选 */}
      <div className="mt-6 flex gap-2">
        {STAGE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStageFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
              stageFilter === f.value
                ? "bg-accent text-white"
                : "bg-muted text-secondary hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 目标列表 */}
      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-tertiary">加载中...</p>
        ) : goals.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function GoalCard({ goal }: { goal: GoalItem }) {
  const scenarioLabel = goal.scenarioType
    ? SCENARIO_TYPE_LABELS[goal.scenarioType as ScenarioTypeEnum]
    : null;
  const stageLabel = GOAL_STAGE_LABELS[goal.currentStage as GoalStageEnum] ?? goal.currentStage;

  return (
    <Link
      href={`/app/goals/${goal.id}`}
      className="block rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/50 hover:shadow-sm animate-rise"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink truncate">
            {goal.title || goal.topic}
          </h3>
          {goal.title && (
            <p className="mt-0.5 text-xs text-tertiary truncate">{goal.topic}</p>
          )}
          {goal.successCriteria && (
            <p className="mt-2 text-xs text-secondary line-clamp-1">
              {goal.successCriteria}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {scenarioLabel && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              {scenarioLabel}
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-secondary">
            {stageLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      <p className="text-sm text-secondary">还没有目标</p>
      <p className="mt-1 text-xs text-tertiary">
        从一句话开始，让系统帮你拆成可推进的步骤
      </p>
      <Link href="/app/goals/new">
        <Button variant="secondary" size="sm" className="mt-4">
          创建第一个目标
        </Button>
      </Link>
    </div>
  );
}

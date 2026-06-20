"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ScenarioTypeEnum,
  SCENARIO_TYPE_LABELS,
  GoalStageEnum,
  GOAL_STAGE_LABELS,
  GoalPriorityEnum,
  GOAL_PRIORITY_LABELS,
  GoalTypeEnum,
  GOAL_TYPE_LABELS,
} from "@ai-task-manager/shared";

interface GoalDetail {
  id: string;
  workspaceId: string;
  topic: string;
  title: string | null;
  scenarioType: string | null;
  audience: string | null;
  duration: number | null;
  shareDate: string | null;
  goalType: string | null;
  preparedness: string | null;
  timeConstraint: string | null;
  resourceConstraint: string | null;
  priority: string | null;
  successCriteria: string | null;
  currentStage: string;
  isCollaborative: boolean;
  sceneTags: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<GoalDetail>(`/goals/${id}`)
      .then(setGoal)
      .catch(() => setError("目标不存在或无权访问"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-sm text-tertiary">加载中...</p>
      </main>
    );
  }

  if (error || !goal) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-sm text-danger">{error || "目标不存在"}</p>
        <Link href="/app/goals">
          <Button variant="secondary" size="sm" className="mt-4">
            返回列表
          </Button>
        </Link>
      </main>
    );
  }

  const handleDelete = async () => {
    if (!confirm("确定删除这个目标？关联的规划和任务也会被清理。")) return;
    setDeleting(true);
    try {
      await api.delete(`/goals/${goal.id}`);
      router.push("/app/goals");
    } catch {
      setError("删除失败，请重试");
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-tertiary animate-rise">
        <Link href="/app/goals" className="hover:text-accent">
          目标
        </Link>
        <span>/</span>
        <span className="text-secondary">{goal.title || goal.topic}</span>
      </div>

      {editing ? (
        <EditGoalForm
          goal={goal}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setGoal(updated);
            setEditing(false);
          }}
          saving={saving}
          setSaving={setSaving}
        />
      ) : (
        <GoalDetailCard goal={goal} />
      )}

      {!editing && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            编辑
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "删除中..." : "删除"}
          </Button>
          <div className="ml-auto">
            <Button size="sm" disabled title="规划引擎即将上线">
              继续规划
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function GoalDetailCard({ goal }: { goal: GoalDetail }) {
  const scenarioLabel = goal.scenarioType
    ? SCENARIO_TYPE_LABELS[goal.scenarioType as ScenarioTypeEnum]
    : null;
  const stageLabel = GOAL_STAGE_LABELS[goal.currentStage as GoalStageEnum] ?? goal.currentStage;
  const priorityLabel = goal.priority
    ? GOAL_PRIORITY_LABELS[goal.priority as GoalPriorityEnum]
    : null;
  const goalTypeLabel = goal.goalType
    ? GOAL_TYPE_LABELS[goal.goalType as GoalTypeEnum]
    : null;

  const fields: Array<{ label: string; value: string | null }> = [
    { label: "原始目标", value: goal.topic },
    { label: "受众", value: goal.audience },
    { label: "时长", value: goal.duration ? `${goal.duration} 分钟` : null },
    { label: "日期", value: goal.shareDate ? goal.shareDate.split("T")[0] : null },
    { label: "分享目标", value: goalTypeLabel },
    { label: "时间约束", value: goal.timeConstraint },
    { label: "资源约束", value: goal.resourceConstraint },
    { label: "成功标准", value: goal.successCriteria },
    { label: "协作", value: goal.isCollaborative ? "是" : "否" },
  ];

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-5 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ink">
            {goal.title || goal.topic}
          </h1>
          {goal.title && (
            <p className="mt-1 text-sm text-secondary">{goal.topic}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {scenarioLabel && (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
              {scenarioLabel}
            </span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-secondary">
            {stageLabel}
          </span>
          {priorityLabel && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-secondary">
              优先级：{priorityLabel}
            </span>
          )}
        </div>
      </div>

      <dl className="mt-5 divide-y divide-border">
        {fields
          .filter((f) => f.value)
          .map((f) => (
            <div key={f.label} className="flex py-2.5">
              <dt className="w-24 shrink-0 text-xs text-tertiary">{f.label}</dt>
              <dd className="text-sm text-ink">{f.value}</dd>
            </div>
          ))}
      </dl>

      <p className="mt-4 text-xs text-tertiary">
        创建于 {new Date(goal.createdAt).toLocaleString("zh-CN")}
      </p>
    </div>
  );
}

function EditGoalForm({
  goal,
  onCancel,
  onSaved,
  saving,
  setSaving,
}: {
  goal: GoalDetail;
  onCancel: () => void;
  onSaved: (g: GoalDetail) => void;
  saving: boolean;
  setSaving: (b: boolean) => void;
}) {
  const [form, setForm] = useState({
    title: goal.title ?? "",
    audience: goal.audience ?? "",
    duration: goal.duration?.toString() ?? "",
    shareDate: goal.shareDate ? goal.shareDate.split("T")[0] : "",
    timeConstraint: goal.timeConstraint ?? "",
    resourceConstraint: goal.resourceConstraint ?? "",
    successCriteria: goal.successCriteria ?? "",
    priority: goal.priority ?? "",
    scenarioType: goal.scenarioType ?? "",
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title || null,
        audience: form.audience || null,
        duration: form.duration ? Number(form.duration) : null,
        shareDate: form.shareDate || null,
        timeConstraint: form.timeConstraint || null,
        resourceConstraint: form.resourceConstraint || null,
        successCriteria: form.successCriteria || null,
        priority: form.priority || null,
        scenarioType: form.scenarioType || null,
      };
      const updated = await api.patch<GoalDetail>(`/goals/${goal.id}`, payload);
      onSaved(updated);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-5 animate-rise">
      <h2 className="text-lg font-semibold text-ink">编辑目标</h2>

      <div className="mt-5 space-y-4">
        <Input
          label="标题"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />
        <Input
          label="受众"
          value={form.audience}
          onChange={(e) => update("audience", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="时长（分钟）"
            type="number"
            value={form.duration}
            onChange={(e) => update("duration", e.target.value)}
          />
          <Input
            label="日期"
            type="date"
            value={form.shareDate}
            onChange={(e) => update("shareDate", e.target.value)}
          />
        </div>
        <Input
          label="时间约束"
          value={form.timeConstraint}
          onChange={(e) => update("timeConstraint", e.target.value)}
        />
        <Input
          label="资源约束"
          value={form.resourceConstraint}
          onChange={(e) => update("resourceConstraint", e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            优先级
          </label>
          <select
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">未设置</option>
            {Object.values(GoalPriorityEnum).map((p) => (
              <option key={p} value={p}>
                {GOAL_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            场景类型
          </label>
          <select
            value={form.scenarioType}
            onChange={(e) => update("scenarioType", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">未设置</option>
            {Object.values(ScenarioTypeEnum).map((s) => (
              <option key={s} value={s}>
                {SCENARIO_TYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            成功标准
          </label>
          <textarea
            value={form.successCriteria}
            onChange={(e) => update("successCriteria", e.target.value)}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            rows={2}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}

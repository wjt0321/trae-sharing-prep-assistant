"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type {
  PlanContent,
  PlanResponseDto,
  PlanCompareResponseDto,
} from "@ai-task-manager/shared";

interface GoalBrief {
  id: string;
  topic: string;
  title: string | null;
  scenarioType: string | null;
  currentStage: string;
}

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<GoalBrief | null>(null);
  const [activePlan, setActivePlan] = useState<PlanResponseDto | null>(null);
  const [versions, setVersions] = useState<PlanResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showReplan, setShowReplan] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [goalData, planData, versionData] = await Promise.all([
        api.get<GoalBrief>(`/goals/${goalId}`),
        api.get<PlanResponseDto | null>(`/goals/${goalId}/plans/active`),
        api.get<PlanResponseDto[]>(`/goals/${goalId}/plans`),
      ]);
      setGoal(goalData);
      setActivePlan(planData);
      setVersions(versionData);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const plan = await api.post<PlanResponseDto>(`/goals/${goalId}/plans`, {});
      setActivePlan(plan);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成规划失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleSwitchVersion = async (version: number) => {
    try {
      const plan = await api.patch<PlanResponseDto>(
        `/goals/${goalId}/plans/active?version=${version}`,
        {}
      );
      setActivePlan(plan);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "切换版本失败");
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <p className="text-sm text-tertiary">加载中...</p>
      </main>
    );
  }

  if (!goal) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <p className="text-sm text-danger">目标不存在或无权访问</p>
        <Link href="/app/goals">
          <Button variant="secondary" size="sm" className="mt-4">
            返回列表
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
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
        <span className="text-secondary">规划</span>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 无规划状态 */}
      {!activePlan && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center animate-rise">
          <h2 className="text-lg font-semibold text-ink">还没有规划</h2>
          <p className="mt-1 text-sm text-secondary">
            让系统帮你把目标拆解为可推进的阶段、任务与里程碑
          </p>
          <Button onClick={handleGenerate} disabled={generating} className="mt-4">
            {generating ? "生成中..." : "生成首版规划"}
          </Button>
        </div>
      )}

      {/* 有规划 */}
      {activePlan && (
        <>
          {/* 顶部操作栏 */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 animate-rise">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-ink">规划方案</h1>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
                v{activePlan.version}
              </span>
              {activePlan.changeReason && (
                <span className="text-xs text-tertiary">
                  {activePlan.changeReason}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowReplan(true)}
              >
                重规划
              </Button>
              {versions.length > 1 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCompare(true)}
                >
                  版本比较
                </Button>
              )}
            </div>
          </div>

          {/* 版本切换器 */}
          {versions.length > 1 && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSwitchVersion(v.version)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      v.isActive
                        ? "border-accent bg-accent/5 text-accent"
                        : "border-border bg-surface text-secondary hover:border-accent/50"
                    }`}
                  >
                    v{v.version}
                    {v.isActive && " · 当前"}
                  </button>
                ))}
              </div>
              {/* 当前选中版本的变更原因 */}
              {activePlan.changeReason && (
                <p className="text-xs text-tertiary">
                  v{activePlan.version} 变更原因：{activePlan.changeReason}
                </p>
              )}
            </div>
          )}

          {/* 规划内容 */}
          <PlanContentDisplay content={activePlan.content} />
        </>
      )}

      {/* 重规划弹窗 */}
      {showReplan && activePlan && (
        <ReplanModal
          goalId={goalId}
          currentVersion={activePlan.version}
          onClose={() => setShowReplan(false)}
          onSuccess={() => {
            setShowReplan(false);
            loadData();
          }}
        />
      )}

      {/* 版本比较弹窗 */}
      {showCompare && versions.length > 1 && (
        <CompareModal
          goalId={goalId}
          versions={versions}
          onClose={() => setShowCompare(false)}
        />
      )}
    </main>
  );
}

// ============================================================
// 规划内容展示
// ============================================================
function PlanContentDisplay({ content }: { content: PlanContent }) {
  return (
    <div className="mt-6 space-y-6">
      {/* 摘要 */}
      <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
        <h2 className="text-sm font-medium text-tertiary">规划摘要</h2>
        <p className="mt-2 text-sm text-ink leading-relaxed">{content.summary}</p>
      </div>

      {/* 阶段与任务 */}
      <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
        <h2 className="text-sm font-medium text-tertiary">
          阶段与任务（{content.phases.length} 个阶段）
        </h2>
        <div className="mt-4 space-y-4">
          {content.phases.map((phase, idx) => (
            <div key={phase.id} className="border-l-2 border-accent/30 pl-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] text-accent">
                  {idx + 1}
                </span>
                <h3 className="text-sm font-semibold text-ink">{phase.name}</h3>
              </div>
              <p className="mt-1 text-xs text-secondary">{phase.description}</p>
              <ul className="mt-2 space-y-1.5">
                {phase.tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        task.priority === "high"
                          ? "bg-danger"
                          : task.priority === "medium"
                          ? "bg-warning"
                          : "bg-tertiary"
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="text-sm text-ink">{task.title}</span>
                      <span className="ml-2 text-[10px] text-tertiary">
                        {task.priority === "high" ? "高优" : task.priority === "medium" ? "中优" : "低优"}
                      </span>
                      {task.description && (
                        <p className="text-xs text-secondary">{task.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 里程碑 + 风险 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 里程碑 */}
        {content.milestones.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
            <h2 className="text-sm font-medium text-tertiary">
              里程碑（{content.milestones.length}）
            </h2>
            <ul className="mt-3 space-y-2">
              {content.milestones.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <span className="mt-0.5 text-success">◆</span>
                  <div>
                    <p className="text-sm text-ink">{m.name}</p>
                    <p className="text-xs text-secondary">{m.description}</p>
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
        )}

        {/* 风险 */}
        {content.risks.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
            <h2 className="text-sm font-medium text-tertiary">
              风险（{content.risks.length}）
            </h2>
            <ul className="mt-3 space-y-2">
              {content.risks.map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 text-xs ${
                      r.impact === "high"
                        ? "text-danger"
                        : r.impact === "medium"
                        ? "text-warning"
                        : "text-tertiary"
                    }`}
                  >
                    ⚠
                  </span>
                  <div>
                    <p className="text-sm text-ink">{r.description}</p>
                    <p className="text-xs text-secondary">缓解：{r.mitigation}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 下一步动作 + 假设 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {content.nextActions.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
            <h2 className="text-sm font-medium text-tertiary">下一步动作</h2>
            <ul className="mt-3 space-y-1.5">
              {content.nextActions.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <span className="text-accent">{i + 1}.</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.assumptions.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 animate-rise">
            <h2 className="text-sm font-medium text-tertiary">说明与假设</h2>
            <ul className="mt-3 space-y-1.5">
              {content.assumptions.map((a, i) => (
                <li key={i} className="flex gap-2 text-xs text-secondary">
                  <span className="text-tertiary">·</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 重规划弹窗
// ============================================================
function ReplanModal({
  goalId,
  currentVersion,
  onClose,
  onSuccess,
}: {
  goalId: string;
  currentVersion: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [timeConstraint, setTimeConstraint] = useState("");
  const [resourceConstraint, setResourceConstraint] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("请填写重规划原因");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { reason };
      const changes: Record<string, string> = {};
      if (timeConstraint) changes.timeConstraint = timeConstraint;
      if (resourceConstraint) changes.resourceConstraint = resourceConstraint;
      if (successCriteria) changes.successCriteria = successCriteria;
      if (Object.keys(changes).length > 0) payload.constraintChanges = changes;

      await api.post(`/goals/${goalId}/replan`, payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "重规划失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-lg animate-rise">
        <h2 className="text-lg font-semibold text-ink">重规划</h2>
        <p className="mt-1 text-xs text-tertiary">
          当前版本 v{currentVersion}，重规划后生成新版本
        </p>

        <div className="mt-4 space-y-4">
          <Input
            label="重规划原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：时间提前了、资源有变化、目标范围调整"
          />
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-tertiary">约束变化（可选）</p>
            <div className="mt-2 space-y-3">
              <Input
                label="时间约束"
                value={timeConstraint}
                onChange={(e) => setTimeConstraint(e.target.value)}
                placeholder="留空表示不修改"
              />
              <Input
                label="资源约束"
                value={resourceConstraint}
                onChange={(e) => setResourceConstraint(e.target.value)}
                placeholder="留空表示不修改"
              />
              <Input
                label="成功标准"
                value={successCriteria}
                onChange={(e) => setSuccessCriteria(e.target.value)}
                placeholder="留空表示不修改"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-danger">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "重规划中..." : "确认重规划"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 版本比较弹窗
// ============================================================
function CompareModal({
  goalId,
  versions,
  onClose,
}: {
  goalId: string;
  versions: PlanResponseDto[];
  onClose: () => void;
}) {
  const [versionA, setVersionA] = useState(versions[1]?.version ?? versions[0].version);
  const [versionB, setVersionB] = useState(versions[0].version);
  const [result, setResult] = useState<PlanCompareResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PlanCompareResponseDto>(
        `/goals/${goalId}/plans/compare?versionA=${versionA}&versionB=${versionB}`
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "比较失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-surface p-6 shadow-lg animate-rise max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-ink">版本比较</h2>

        <div className="mt-4 flex items-center gap-3">
          <select
            value={versionA}
            onChange={(e) => setVersionA(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.version}>
                v{v.version}
              </option>
            ))}
          </select>
          <span className="text-sm text-tertiary">vs</span>
          <select
            value={versionB}
            onChange={(e) => setVersionB(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.version}>
                v{v.version}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleCompare} disabled={loading}>
            {loading ? "比较中..." : "比较"}
          </Button>
        </div>

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}

        {result && (
          <div className="mt-4">
            <p className="text-sm font-medium text-ink">{result.summary}</p>
            <div className="mt-3 space-y-2">
              {result.diffs.length === 0 ? (
                <p className="text-sm text-tertiary">两个版本无差异</p>
              ) : (
                result.diffs.map((d, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                      d.type === "added"
                        ? "border-success/30 bg-success/5"
                        : d.type === "removed"
                        ? "border-danger/30 bg-danger/5"
                        : "border-warning/30 bg-warning/5"
                    }`}
                  >
                    <span className="shrink-0 text-xs font-medium">
                      {d.type === "added" ? "新增" : d.type === "removed" ? "移除" : "修改"}
                    </span>
                    <span className="text-xs text-tertiary">{d.area}</span>
                    <span className="text-ink">{d.description}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}

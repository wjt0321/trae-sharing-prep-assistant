"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { BusinessMetricsDto } from "@ai-task-manager/shared";
import { Metric } from "./Metric";

// ============================================================
// Tab 2: 业务指标
// ============================================================
export function BusinessTab() {
  const { error } = useToast();
  const [metrics, setMetrics] = useState<BusinessMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const loadData = useCallback(
    async (d: number) => {
      setLoading(true);
      setErrorState(null);
      try {
        const data = await api.get<BusinessMetricsDto>(
          `/monitoring/business?days=${d}`,
        );
        setMetrics(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "加载失败";
        setErrorState(msg);
        error(msg);
      } finally {
        setLoading(false);
      }
    },
    [error],
  );

  useEffect(() => {
    loadData(days);
  }, [days, loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (errorState) {
    return (
      <ErrorState
        title="加载失败"
        description={errorState}
        onRetry={() => loadData(days)}
      />
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-tertiary">时间范围</span>
        <Select
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-32"
          options={[
            { label: "最近 1 天", value: "1" },
            { label: "最近 7 天", value: "7" },
            { label: "最近 30 天", value: "30" },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 目标创建 */}
        <Card>
          <CardHeader>
            <CardTitle>目标创建</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="创建数"
                value={metrics.goalCreation.totalAttempts.toString()}
              />
              <Metric
                label="成功率"
                value={`${(metrics.goalCreation.successRate * 100).toFixed(1)}%`}
              />
            </div>
            {metrics.goalCreation.byScenarioType.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-tertiary">场景分布</p>
                <div className="space-y-1">
                  {metrics.goalCreation.byScenarioType.map((s) => (
                    <div
                      key={s.scenarioType}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-secondary">{s.scenarioType}</span>
                      <span className="text-tertiary">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 规划采纳 */}
        <Card>
          <CardHeader>
            <CardTitle>规划采纳</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="有规划的目标"
                value={metrics.planAdoption.goalsWithPlan.toString()}
              />
              <Metric
                label="总目标"
                value={metrics.planAdoption.totalGoals.toString()}
              />
              <Metric
                label="采纳率"
                value={`${(metrics.planAdoption.adoptionRate * 100).toFixed(1)}%`}
              />
            </div>
            {metrics.planAdoption.bySource.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-tertiary">来源分布</p>
                <div className="space-y-1">
                  {metrics.planAdoption.bySource.map((s) => (
                    <div
                      key={s.source}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-secondary">{s.source}</span>
                      <span className="text-tertiary">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 重规划使用 */}
        <Card>
          <CardHeader>
            <CardTitle>重规划使用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="重规划目标数"
                value={metrics.replanUsage.goalsWithReplan.toString()}
              />
              <Metric
                label="总重规划次数"
                value={metrics.replanUsage.totalReplans.toString()}
              />
              <Metric
                label="平均次数"
                value={metrics.replanUsage.avgReplansPerGoal.toFixed(2)}
              />
              <Metric
                label="使用率"
                value={`${(metrics.replanUsage.replanRate * 100).toFixed(1)}%`}
              />
            </div>
          </CardContent>
        </Card>

        {/* 目标推进 */}
        <Card>
          <CardHeader>
            <CardTitle>目标推进</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="已完成"
                value={metrics.goalProgress.completedCount.toString()}
              />
              <Metric
                label="总目标"
                value={metrics.goalProgress.totalGoals.toString()}
              />
              <Metric
                label="完成率"
                value={`${(metrics.goalProgress.completionRate * 100).toFixed(1)}%`}
              />
              <Metric
                label="平均任务完成率"
                value={`${(metrics.goalProgress.avgTaskCompletionRate * 100).toFixed(1)}%`}
              />
            </div>
            {metrics.goalProgress.byStage.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-tertiary">阶段分布</p>
                <div className="space-y-1">
                  {metrics.goalProgress.byStage.map((s) => (
                    <div
                      key={s.stage}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-secondary">{s.stage}</span>
                      <span className="text-tertiary">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 导出与分享 */}
        <Card>
          <CardHeader>
            <CardTitle>导出与分享</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="导出次数"
                value={metrics.exportShare.totalExports.toString()}
              />
              <Metric
                label="分享链接"
                value={metrics.exportShare.shareCount.toString()}
              />
              <Metric
                label="失败次数"
                value={metrics.exportShare.failureCount.toString()}
              />
            </div>
            {metrics.exportShare.byType.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-tertiary">类型分布</p>
                <div className="space-y-1">
                  {metrics.exportShare.byType.map((t) => (
                    <div
                      key={t.type}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-secondary">{t.type}</span>
                      <span className="text-tertiary">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 模板复用 */}
        <Card>
          <CardHeader>
            <CardTitle>模板复用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="模板总数"
                value={metrics.templateReuse.totalTemplates.toString()}
              />
              <Metric
                label="使用总次数"
                value={metrics.templateReuse.totalUsageCount.toString()}
              />
              <Metric
                label="平均使用"
                value={metrics.templateReuse.avgUsagePerTemplate.toFixed(2)}
              />
              <Metric
                label="复用率"
                value={`${(metrics.templateReuse.reuseRate * 100).toFixed(1)}%`}
              />
            </div>
            {metrics.templateReuse.topTemplates.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-tertiary">热门模板</p>
                <div className="space-y-1">
                  {metrics.templateReuse.topTemplates.map((t) => (
                    <div
                      key={t.templateId}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-secondary">{t.name}</span>
                      <span className="text-tertiary">{t.usageCount} 次</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import {
  SkeletonCard,
} from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type {
  HealthResponseDto,
  SystemMetricsDto,
} from "@ai-task-manager/shared";
import { Metric, formatUptime, formatBytes } from "./Metric";

// ============================================================
// Tab 1: 系统概览（健康检查 + 系统指标）
// ============================================================
export function OverviewTab() {
  const { success, error } = useToast();
  const [health, setHealth] = useState<HealthResponseDto | null>(null);
  const [system, setSystem] = useState<SystemMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [healthData, systemData] = await Promise.all([
        api.get<HealthResponseDto>("/monitoring/health"),
        api.get<SystemMetricsDto>("/monitoring/system?days=7"),
      ]);
      setHealth(healthData);
      setSystem(systemData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "加载失败";
      setErrorState(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        onRetry={loadData}
      />
    );
  }

  if (!health || !system) return null;

  const statusColor =
    health.status === "ok"
      ? "success"
      : health.status === "degraded"
        ? "warning"
        : "danger";
  const statusLabel =
    health.status === "ok"
      ? "正常"
      : health.status === "degraded"
        ? "降级"
        : "异常";

  return (
    <div className="space-y-6">
      {/* 健康检查卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>服务健康</span>
            <Tag color={statusColor as any}>{statusLabel}</Tag>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Metric label="版本" value={health.version} />
            <Metric label="环境" value={health.env} />
            <Metric
              label="运行时长"
              value={formatUptime(health.uptimeSeconds)}
            />
            <Metric
              label="启动时间"
              value={new Date(health.startedAt).toLocaleString("zh-CN")}
            />
          </div>
          <div className="space-y-2">
            {health.checks.map((check) => {
              const c =
                check.status === "ok"
                  ? "success"
                  : check.status === "degraded"
                    ? "warning"
                    : "danger";
              return (
                <div
                  key={check.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Tag color={c as any}>
                      {check.status === "ok"
                        ? "正常"
                        : check.status === "degraded"
                          ? "降级"
                          : "异常"}
                    </Tag>
                    <span className="text-sm font-medium text-ink">
                      {check.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-tertiary">
                    <span>{check.detail ?? check.errorMessage}</span>
                    <span>{check.durationMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 系统指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>请求统计（最近 7 天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="总请求"
                value={system.requests.totalRequests.toString()}
              />
              <Metric
                label="错误率"
                value={`${(system.requests.errorRate * 100).toFixed(2)}%`}
              />
              <Metric
                label="平均响应"
                value={`${system.requests.avgDurationMs.toFixed(0)}ms`}
              />
              <Metric
                label="慢请求"
                value={system.requests.slowRequests.toString()}
              />
              <Metric
                label="客户端错误"
                value={system.requests.clientErrors.toString()}
              />
              <Metric
                label="服务端错误"
                value={system.requests.serverErrors.toString()}
              />
            </div>
            {system.requests.byStatusCode.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-tertiary">状态码分布</p>
                <div className="flex flex-wrap gap-2">
                  {system.requests.byStatusCode.map((s) => (
                    <Tag key={s.statusCode}>
                      {s.statusCode}: {s.count}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>任务队列</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="排队中" value={system.taskQueue.queued.toString()} />
              <Metric label="执行中" value={system.taskQueue.running.toString()} />
              <Metric
                label="已成功"
                value={system.taskQueue.succeeded.toString()}
              />
              <Metric
                label="已失败"
                value={system.taskQueue.failed.toString()}
              />
              <Metric
                label="失败率"
                value={`${(system.taskQueue.failureRate * 100).toFixed(2)}%`}
              />
            </div>
            {system.taskQueue.byType.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-tertiary">按类型分布</p>
                <div className="space-y-1">
                  {system.taskQueue.byType.map((t) => (
                    <div
                      key={t.type}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-secondary">{t.type}</span>
                      <span className="text-tertiary">
                        {t.count} 次 / {t.failureCount} 失败
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 调用（最近 7 天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="总调用"
                value={system.aiCalls.totalCalls.toString()}
              />
              <Metric
                label="失败率"
                value={`${(system.aiCalls.failureRate * 100).toFixed(2)}%`}
              />
              <Metric
                label="平均耗时"
                value={`${system.aiCalls.avgDurationMs.toFixed(0)}ms`}
              />
              <Metric
                label="失败次数"
                value={system.aiCalls.failureCount.toString()}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据库</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Metric
                label="DB 文件大小"
                value={formatBytes(system.database.dbSizeBytes)}
              />
            </div>
            <div className="space-y-1">
              <p className="mb-1 text-xs text-tertiary">表行数</p>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {system.database.tableCounts.map((t) => (
                  <div
                    key={t.table}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-secondary">{t.table}</span>
                    <span className="text-tertiary">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button variant="secondary" onClick={loadData}>
          刷新数据
        </Button>
      </div>
    </div>
  );
}

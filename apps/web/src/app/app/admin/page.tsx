"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
} from "@/components/ui/Skeleton";
import { PageContainer, PageHeader, Section } from "@/components/layout/PageContainer";
import type {
  HealthResponseDto,
  BusinessMetricsDto,
  SystemMetricsDto,
  AuditLogResponseDto,
  AuditStatsDto,
  AuditActionEnum,
  AuditResultEnum,
  AuditResourceTypeEnum,
} from "@ai-task-manager/shared";

// ============================================================
// 管理后台监控页
//
// 参考：12_安全监控指标与发布治理实施清单.md
//
// 三个 Tab：
// 1. 概览：健康检查 + 系统指标
// 2. 业务指标：目标 / 规划 / 执行 / 导出 / 模板
// 3. 审计日志：关键操作流水
// ============================================================

type TabKey = "overview" | "business" | "audit";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "overview", label: "系统概览", icon: "📊" },
  { key: "business", label: "业务指标", icon: "📈" },
  { key: "audit", label: "审计日志", icon: "🔍" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <PageContainer size="wide">
      <PageHeader
        title="管理后台"
        description="系统监控、业务指标与审计日志"
      />

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors ${
              tab === t.key
                ? "border-accent text-accent font-medium"
                : "border-transparent text-secondary hover:text-ink"
            }`}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "business" && <BusinessTab />}
      {tab === "audit" && <AuditTab />}
    </PageContainer>
  );
}

// ============================================================
// Tab 1: 系统概览（健康检查 + 系统指标）
// ============================================================
function OverviewTab() {
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

// ============================================================
// Tab 2: 业务指标
// ============================================================
function BusinessTab() {
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

// ============================================================
// Tab 3: 审计日志
// ============================================================
function AuditTab() {
  const { error } = useToast();
  const [logs, setLogs] = useState<AuditLogResponseDto[]>([]);
  const [stats, setStats] = useState<AuditStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    result: "",
    keyword: "",
  });

  const loadData = useCallback(
    async (p: number) => {
      setLoading(true);
      setErrorState(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("pageSize", "20");
        if (filters.action) params.set("action", filters.action);
        if (filters.result) params.set("result", filters.result);
        if (filters.keyword) params.set("keyword", filters.keyword);

        const [listData, statsData] = await Promise.all([
          api.get<{
            items: AuditLogResponseDto[];
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
          }>(`/audit?${params.toString()}`),
          api.get<AuditStatsDto>("/audit/stats/summary?days=7"),
        ]);
        setLogs(listData.items);
        setTotalPages(listData.totalPages);
        setPage(listData.page);
        setStats(statsData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "加载失败";
        setErrorState(msg);
        error(msg);
      } finally {
        setLoading(false);
      }
    },
    [filters, error],
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (errorState && logs.length === 0) {
    return (
      <ErrorState
        title="加载失败"
        description={errorState}
        onRetry={() => loadData(1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 审计统计卡片 */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>审计统计（最近 {stats.days} 天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <Metric label="总操作" value={stats.totalActions.toString()} />
              <Metric
                label="成功"
                value={stats.totalSuccess.toString()}
              />
              <Metric
                label="失败"
                value={stats.totalFailure.toString()}
              />
            </div>
            {stats.recentFailures.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-tertiary">最近失败</p>
                <div className="space-y-1">
                  {stats.recentFailures.slice(0, 5).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded border border-border bg-danger/5 px-2 py-1 text-xs"
                    >
                      <span className="text-secondary">
                        {f.action} · {f.actorEmail ?? "未知"}
                      </span>
                      <span className="text-danger">
                        {f.errorMessage ?? "未知错误"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 筛选器 */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="动作类型"
              value={filters.action}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
              options={[
                { label: "全部", value: "" },
                { label: "登录", value: "login" },
                { label: "退出", value: "logout" },
                { label: "注册", value: "register" },
                { label: "创建", value: "create" },
                { label: "更新", value: "update" },
                { label: "删除", value: "delete" },
                { label: "导出", value: "export" },
                { label: "分享", value: "share" },
                { label: "配置变更", value: "config_change" },
                { label: "密码修改", value: "password_change" },
                { label: "邀请", value: "invite" },
                { label: "角色变更", value: "role_change" },
              ]}
            />
            <Select
              label="结果"
              value={filters.result}
              onChange={(e) =>
                setFilters({ ...filters, result: e.target.value })
              }
              options={[
                { label: "全部", value: "" },
                { label: "成功", value: "success" },
                { label: "失败", value: "failure" },
              ]}
            />
            <Input
              label="关键词"
              placeholder="邮箱 / 路径 / 错误信息"
              value={filters.keyword}
              onChange={(e) =>
                setFilters({ ...filters, keyword: e.target.value })
              }
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadData(1)}
            >
              查询
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 审计日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle>审计日志</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <Empty
              icon="🔍"
              title="暂无审计日志"
              description="尝试调整筛选条件或更换时间范围"
            />
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Tag
                        color={
                          log.result === "success" ? "success" : "danger"
                        }
                      >
                        {log.result === "success" ? "成功" : "失败"}
                      </Tag>
                      <Tag color="accent">{log.actionLabel}</Tag>
                      {log.resourceType && (
                        <Tag>
                          {log.resourceType}
                          {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}` : ""}
                        </Tag>
                      )}
                    </div>
                    <span className="text-xs text-tertiary">
                      {new Date(log.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tertiary">
                    <span>操作者: {log.actorEmail ?? "未知"}</span>
                    {log.method && log.path && (
                      <span>
                        {log.method} {log.path}
                      </span>
                    )}
                    {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                    {log.errorMessage && (
                      <span className="text-danger">
                        错误: {log.errorMessage}
                      </span>
                    )}
                  </div>
                  {log.detail && Object.keys(log.detail).length > 0 && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs text-tertiary hover:text-ink">
                        详情
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs text-secondary">
                        {JSON.stringify(log.detail, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => loadData(page - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-tertiary">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => loadData(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 通用小组件
// ============================================================
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-tertiary">{label}</p>
      <p className="mt-0.5 font-medium text-ink">{value}</p>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

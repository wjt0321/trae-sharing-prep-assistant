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
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type {
  AuditLogResponseDto,
  AuditStatsDto,
} from "@ai-task-manager/shared";
import { Metric } from "./Metric";

// ============================================================
// Tab 3: 审计日志
// ============================================================
export function AuditTab() {
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
              icon="/icons/ico-empty-default.png"
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

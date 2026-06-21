"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/lib/workspace";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  TemplateCategoryEnum,
  ScenarioTypeEnum,
  SCENARIO_TYPE_LABELS,
  TEMPLATE_CATEGORY_LABELS,
  type TemplateListItemDto,
  type TemplateResponseDto,
  type CreateGoalFromTemplateResponseDto,
} from "@ai-task-manager/shared";

const CATEGORY_FILTERS = [
  { value: "", label: "全部" },
  ...Object.values(TemplateCategoryEnum).map((c) => ({
    value: c,
    label: TEMPLATE_CATEGORY_LABELS[c],
  })),
];

export default function TemplatesPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [templates, setTemplates] = useState<TemplateListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [detail, setDetail] = useState<TemplateResponseDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      if (keyword) params.set("keyword", keyword);
      const query = params.toString();
      const data = await api.get<TemplateListItemDto[]>(
        `/workspaces/${currentWorkspace.id}/templates${query ? `?${query}` : ""}`,
      );
      setTemplates(data);
    } catch {
      setError("加载模板失败");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, categoryFilter, keyword]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const data = await api.get<TemplateResponseDto>(`/templates/${id}`);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载详情失败");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUseTemplate = async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const data = await api.get<CreateGoalFromTemplateResponseDto>(
        `/templates/${id}/for-goal`,
      );
      // 把预填字段存到 sessionStorage，跳转到新建目标页
      sessionStorage.setItem(
        "prefillGoalFromTemplate",
        JSON.stringify(data.prefilledFields),
      );
      sessionStorage.setItem(
        "templateHints",
        JSON.stringify({
          planHints: data.planHints,
          riskHints: data.riskHints,
          checklist: data.checklist,
          templateName: data.template.name,
        }),
      );
      router.push("/app/goals/new?from=template");
    } catch (err) {
      setError(err instanceof Error ? err.message : "应用模板失败");
    } finally {
      setLoadingDetail(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-tertiary">请先选择工作区</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between animate-rise">
        <div>
          <h1 className="text-2xl font-semibold text-ink">模板库</h1>
          <p className="mt-1 text-sm text-secondary">
            从模板启动目标，复用经验，少走弯路
          </p>
        </div>
        <Link href="/app/goals/new">
          <Button variant="secondary">从零创建</Button>
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 筛选 */}
      <div className="mt-6 flex flex-wrap items-center gap-3 animate-rise">
        <div className="flex gap-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCategoryFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                categoryFilter === f.value
                  ? "bg-accent text-white"
                  : "bg-muted text-secondary hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索模板名称或描述"
          className="ml-auto w-64 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* 模板列表 */}
      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-tertiary">加载中...</p>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <p className="text-sm text-secondary">还没有模板</p>
            <p className="mt-1 text-xs text-tertiary">
              可以从高质量目标沉淀为模板，或先创建一个目标再转为模板
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onView={() => handleViewDetail(t.id)}
                onUse={() => handleUseTemplate(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 详情弹层 */}
      {detail && (
        <TemplateDetailModal
          template={detail}
          loading={loadingDetail}
          onClose={() => setDetail(null)}
          onUse={() => handleUseTemplate(detail.id)}
        />
      )}
    </main>
  );
}

function TemplateCard({
  template,
  onView,
  onUse,
}: {
  template: TemplateListItemDto;
  onView: () => void;
  onUse: () => void;
}) {
  const categoryLabel = TEMPLATE_CATEGORY_LABELS[template.category];
  const scenarioLabel = template.scenarioType
    ? SCENARIO_TYPE_LABELS[template.scenarioType as ScenarioTypeEnum]
    : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-sm animate-rise">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink truncate">
              {template.name}
            </h3>
            {template.isBuiltIn && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                内置
              </span>
            )}
          </div>
          {template.description && (
            <p className="mt-1 text-xs text-secondary line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-secondary">
          {categoryLabel}
        </span>
        {scenarioLabel && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-secondary">
            {scenarioLabel}
          </span>
        )}
        {template.usageCount > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-tertiary">
            用过 {template.usageCount} 次
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onView}
          className="rounded px-2 py-1 text-xs text-secondary hover:bg-muted hover:text-accent"
        >
          查看详情
        </button>
        <button
          onClick={onUse}
          className="rounded px-2 py-1 text-xs text-accent hover:bg-muted"
        >
          用此模板创建
        </button>
      </div>
    </div>
  );
}

function TemplateDetailModal({
  template,
  loading,
  onClose,
  onUse,
}: {
  template: TemplateResponseDto;
  loading: boolean;
  onClose: () => void;
  onUse: () => void;
}) {
  const c = template.content;
  const scenarioLabel = template.scenarioType
    ? SCENARIO_TYPE_LABELS[template.scenarioType as ScenarioTypeEnum]
    : null;

  const fields: Array<{ label: string; value: string | undefined }> = [
    { label: "受众", value: c.audience },
    { label: "时长", value: c.duration ? `${c.duration} 分钟` : undefined },
    { label: "时间约束", value: c.timeConstraint },
    { label: "资源约束", value: c.resourceConstraint },
    { label: "成功标准", value: c.successCriteria },
  ].filter((f) => f.value) as Array<{ label: string; value: string }>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">
                {template.name}
              </h2>
              {template.isBuiltIn && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                  内置
                </span>
              )}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-secondary">
                {TEMPLATE_CATEGORY_LABELS[template.category]}
              </span>
              {scenarioLabel && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-secondary">
                  {scenarioLabel}
                </span>
              )}
            </div>
            {template.description && (
              <p className="mt-2 text-sm text-secondary">{template.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-tertiary hover:bg-muted hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {fields.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium text-tertiary">预设字段</p>
            <dl className="mt-2 divide-y divide-border rounded-lg border border-border">
              {fields.map((f) => (
                <div key={f.label} className="flex px-3 py-2">
                  <dt className="w-24 shrink-0 text-xs text-tertiary">{f.label}</dt>
                  <dd className="text-sm text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {c.planHints && c.planHints.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium text-tertiary">规划阶段要点</p>
            <ul className="mt-2 space-y-1.5">
              {c.planHints.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-secondary">
                  <span className="text-accent">·</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {c.checklist && c.checklist.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium text-tertiary">执行检查清单</p>
            <ul className="mt-2 space-y-1.5">
              {c.checklist.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-secondary">
                  <span className="text-success">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          <Button onClick={onUse} disabled={loading}>
            {loading ? "准备中..." : "用此模板创建目标"}
          </Button>
        </div>
      </div>
    </div>
  );
}

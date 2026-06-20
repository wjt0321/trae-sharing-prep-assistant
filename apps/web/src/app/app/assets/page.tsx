"use client";

import { useEffect, useState, useCallback } from "react";
import { useWorkspace } from "@/lib/workspace";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  KnowledgeAssetTypeEnum,
  KNOWLEDGE_ASSET_TYPE_LABELS,
  KNOWLEDGE_ASSET_TYPE_DESCRIPTIONS,
  type KnowledgeAssetListItemDto,
  type KnowledgeAssetResponseDto,
} from "@ai-task-manager/shared";

const TYPE_FILTERS = [
  { value: "", label: "全部" },
  ...Object.values(KnowledgeAssetTypeEnum).map((t) => ({
    value: t,
    label: KNOWLEDGE_ASSET_TYPE_LABELS[t],
  })),
];

export default function AssetsPage() {
  const { currentWorkspace } = useWorkspace();
  const [assets, setAssets] = useState<KnowledgeAssetListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [tagsQuery, setTagsQuery] = useState("");
  const [detail, setDetail] = useState<KnowledgeAssetResponseDto | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadAssets = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const params = new URLSearchParams({ workspaceId: currentWorkspace.id });
      if (typeFilter) params.set("type", typeFilter);
      if (keyword) params.set("keyword", keyword);
      if (tagsQuery) params.set("tags", tagsQuery);
      const data = await api.get<KnowledgeAssetListItemDto[]>(
        `/workspaces/${currentWorkspace.id}/assets?${params.toString()}`,
      );
      setAssets(data);
    } catch {
      setError("加载知识资产失败");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, typeFilter, keyword, tagsQuery]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleView = async (id: string) => {
    setError(null);
    try {
      const data = await api.get<KnowledgeAssetResponseDto>(`/assets/${id}`);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载详情失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这个知识资产？")) return;
    try {
      await api.delete(`/assets/${id}`);
      if (detail?.id === id) setDetail(null);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
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
          <h1 className="text-2xl font-semibold text-ink">知识资产库</h1>
          <p className="mt-1 text-sm text-secondary">
            沉淀经验、洞察、清单与案例，让每次推进都站在上一次的肩膀上
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>新建资产</Button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 筛选 */}
      <div className="mt-6 flex flex-wrap items-center gap-3 animate-rise">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                typeFilter === f.value
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
          placeholder="搜索标题或内容"
          className="w-56 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <input
          value={tagsQuery}
          onChange={(e) => setTagsQuery(e.target.value)}
          placeholder="按标签筛选（逗号分隔）"
          className="w-56 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* 资产列表 */}
      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-tertiary">加载中...</p>
        ) : assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <p className="text-sm text-secondary">还没有知识资产</p>
            <p className="mt-1 text-xs text-tertiary">
              可以手动新建，或在导出页把成果沉淀为案例
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {assets.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                onView={() => handleView(a.id)}
                onDelete={() => handleDelete(a.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 详情弹层 */}
      {detail && (
        <AssetDetailModal
          asset={detail}
          onClose={() => setDetail(null)}
          onDelete={() => handleDelete(detail.id)}
        />
      )}

      {/* 新建资产弹层 */}
      {showCreate && currentWorkspace && (
        <CreateAssetModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadAssets();
          }}
          workspaceId={currentWorkspace.id}
        />
      )}
    </main>
  );
}

function AssetCard({
  asset,
  onView,
  onDelete,
}: {
  asset: KnowledgeAssetListItemDto;
  onView: () => void;
  onDelete: () => void;
}) {
  const typeLabel = KNOWLEDGE_ASSET_TYPE_LABELS[asset.type];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-sm animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink truncate">
              {asset.title}
            </h3>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              {typeLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-secondary line-clamp-2">{asset.summary}</p>
          {asset.tagList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {asset.tagList.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-tertiary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-tertiary">
            {new Date(asset.createdAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onView}
            className="rounded px-2 py-1 text-xs text-secondary hover:bg-muted hover:text-accent"
          >
            查看
          </button>
          <button
            onClick={onDelete}
            className="rounded px-2 py-1 text-xs text-tertiary hover:bg-muted hover:text-danger"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetDetailModal({
  asset,
  onClose,
  onDelete,
}: {
  asset: KnowledgeAssetResponseDto;
  onClose: () => void;
  onDelete: () => void;
}) {
  const typeLabel = KNOWLEDGE_ASSET_TYPE_LABELS[asset.type];

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
              <h2 className="text-lg font-semibold text-ink">{asset.title}</h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                {typeLabel}
              </span>
            </div>
            {asset.tagList.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {asset.tagList.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-tertiary"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
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

        <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-lg border border-border bg-muted/20 p-4">
          <MarkdownRenderer content={asset.content} />
        </div>

        <p className="mt-3 text-xs text-tertiary">
          创建于 {new Date(asset.createdAt).toLocaleString("zh-CN")}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          <Button variant="danger" onClick={onDelete}>
            删除
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateAssetModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<KnowledgeAssetTypeEnum>(KnowledgeAssetTypeEnum.ASSET);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      setError("标题和内容不能为空");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post(`/workspaces/${workspaceId}/assets`, {
        title: title.trim(),
        type,
        content: content.trim(),
        tags: tags.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

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
          <h2 className="text-lg font-semibold text-ink">新建知识资产</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-tertiary hover:bg-muted hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <Input
            label="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给这个资产起个名字"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              类型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(KnowledgeAssetTypeEnum).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    type === t
                      ? "border-accent bg-accent/5"
                      : "border-border bg-surface hover:border-accent/40"
                  }`}
                >
                  <p className="text-sm font-medium text-ink">
                    {KNOWLEDGE_ASSET_TYPE_LABELS[t]}
                  </p>
                  <p className="mt-0.5 text-xs text-tertiary">
                    {KNOWLEDGE_ASSET_TYPE_DESCRIPTIONS[t]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              内容（支持 Markdown）
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下你想沉淀的内容..."
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              rows={8}
            />
          </div>

          <Input
            label="标签（逗号分隔）"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="例如：经验,前端,工程化"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "创建中..." : "创建"}
          </Button>
        </div>
      </div>
    </div>
  );
}

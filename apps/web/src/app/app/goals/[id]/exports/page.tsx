"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, tokenStorage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  ExportTypeEnum,
  ExportFormatEnum,
  EXPORT_TYPE_LABELS,
  EXPORT_TYPE_DESCRIPTIONS,
  EXPORT_FORMAT_LABELS,
  type ExportListItemDto,
  type ExportResponseDto,
} from "@ai-task-manager/shared";

const EXPORT_TYPES = Object.values(ExportTypeEnum) as ExportTypeEnum[];
const EXPORT_FORMATS = Object.values(ExportFormatEnum) as ExportFormatEnum[];

export default function ExportsPage() {
  const params = useParams();
  const goalId = params.id as string;

  const [exports, setExports] = useState<ExportListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ExportTypeEnum>(ExportTypeEnum.PHASE_PLAN);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatEnum>(ExportFormatEnum.MARKDOWN);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<ExportResponseDto | null>(null);

  const loadExports = useCallback(async () => {
    try {
      const data = await api.get<ExportListItemDto[]>(`/goals/${goalId}/exports`);
      setExports(data);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    loadExports();
  }, [loadExports]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await api.post<ExportResponseDto>(`/goals/${goalId}/exports`, {
        type: selectedType,
        format: selectedFormat,
      });
      setPreview(result);
      await loadExports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setCreating(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      const data = await api.get<ExportResponseDto>(`/exports/${id}`);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  };

  const handleToggleShare = async (item: ExportListItemDto) => {
    try {
      await api.patch(`/exports/${item.id}/share`, {
        enableShare: !item.isShareActive,
      });
      await loadExports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/exports/${id}`);
      if (preview?.id === id) setPreview(null);
      await loadExports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleDownload = (id: string, title: string) => {
    const token = tokenStorage.getAccess();
    const url = `/api/server/exports/${id}/download`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${title}.md`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-tertiary">加载中...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-xs text-tertiary animate-rise">
        <Link href="/app/goals" className="hover:text-accent">
          目标
        </Link>
        <span>/</span>
        <Link href={`/app/goals/${goalId}`} className="hover:text-accent">
          详情
        </Link>
        <span>/</span>
        <span className="text-secondary">导出分享</span>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* 创建导出 */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-5 animate-rise">
        <h1 className="text-lg font-semibold text-ink">导出与分享</h1>
        <p className="mt-1 text-sm text-secondary">
          把目标结果导出为结构化文档，面向交付优化，可直接分享或汇报
        </p>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-secondary">选择导出类型</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {EXPORT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedType === type
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface hover:border-accent/40"
                }`}
              >
                <p className="text-sm font-medium text-ink">
                  {EXPORT_TYPE_LABELS[type]}
                </p>
                <p className="mt-0.5 text-xs text-tertiary">
                  {EXPORT_TYPE_DESCRIPTIONS[type]}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-secondary">选择格式</p>
          <div className="flex gap-2">
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  selectedFormat === format
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-border bg-surface text-secondary hover:border-accent/40"
                }`}
              >
                {EXPORT_FORMAT_LABELS[format]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "生成中..." : "生成导出"}
          </Button>
        </div>
      </div>

      {/* 预览 */}
      {preview && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5 animate-rise">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-tertiary">
              预览：{preview.title}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload(preview.id, preview.title)}
              >
                下载 .md
              </Button>
              {preview.format === ExportFormatEnum.PRINTABLE && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                >
                  打印 / PDF
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreview(null)}
              >
                关闭预览
              </Button>
            </div>
          </div>
          <div className="mt-4 max-h-[500px] overflow-y-auto rounded-lg border border-border bg-muted/20 p-4">
            <MarkdownRenderer content={preview.content} />
          </div>
        </div>
      )}

      {/* 导出记录列表 */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-5 animate-rise">
        <h2 className="text-sm font-medium text-tertiary">
          导出记录（{exports.length}）
        </h2>

        {exports.length === 0 ? (
          <p className="mt-4 text-sm text-tertiary">
            还没有导出记录，选择类型和格式后生成第一个导出
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {exports.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-4 py-3 hover:border-border hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(item.id)}
                      className="text-sm font-medium text-ink hover:text-accent"
                    >
                      {item.title}
                    </button>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-secondary">
                      {EXPORT_TYPE_LABELS[item.type]}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-tertiary">
                      {EXPORT_FORMAT_LABELS[item.format]}
                    </span>
                    {item.isShareActive && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
                        分享中
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-tertiary">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => handleView(item.id)}
                    className="rounded px-2 py-1 text-xs text-secondary hover:bg-muted hover:text-accent"
                  >
                    查看
                  </button>
                  <button
                    onClick={() => handleDownload(item.id, item.title)}
                    className="rounded px-2 py-1 text-xs text-secondary hover:bg-muted hover:text-accent"
                  >
                    下载
                  </button>
                  <button
                    onClick={() => handleToggleShare(item)}
                    className={`rounded px-2 py-1 text-xs hover:bg-muted ${
                      item.isShareActive ? "text-danger" : "text-success"
                    }`}
                  >
                    {item.isShareActive ? "取消分享" : "生成分享"}
                  </button>
                  {item.isShareActive && item.shareToken && (
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/share/${item.shareToken}`;
                        navigator.clipboard.writeText(url);
                        setError("分享链接已复制到剪贴板");
                        setTimeout(() => setError(null), 2000);
                      }}
                      className="rounded px-2 py-1 text-xs text-accent hover:bg-muted"
                    >
                      复制链接
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded px-2 py-1 text-xs text-tertiary hover:bg-muted hover:text-danger"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

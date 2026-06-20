"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  EXPORT_FORMAT_LABELS,
  type SharePageResponseDto,
} from "@ai-task-manager/shared";

const API_BASE = "/api/server";

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharePageResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 共享页是公开访问，用原生 fetch 绕过认证逻辑
    fetch(`${API_BASE}/shares/${token}`)
      .then((res) => res.json())
      .then((json: { success: boolean; data: SharePageResponseDto | null; error: { message: string } | null }) => {
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message ?? "分享链接无效或已失效");
        }
      })
      .catch(() => setError("分享链接无效或已失效"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([data.content], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${data.title}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-tertiary">加载中...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
        <div className="rounded-xl border border-border bg-surface px-8 py-10 text-center">
          <p className="text-lg font-semibold text-ink">无法访问</p>
          <p className="mt-2 text-sm text-secondary">
            {error || "分享链接无效或已失效"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas">
      {/* 顶部栏 */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-3xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-tertiary">AI 任务管家 · 共享文档</p>
              <h1 className="mt-0.5 truncate text-base font-semibold text-ink">
                {data.goalTitle}
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              {data.allowDownload && (
                <button
                  onClick={handleDownload}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-secondary transition-colors hover:border-accent/40 hover:text-accent"
                >
                  下载 .md
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-secondary transition-colors hover:border-accent/40 hover:text-accent"
              >
                打印 / PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 文档内容 */}
      <article className="mx-auto w-full max-w-3xl px-6 py-8 print:py-0">
        <div className="mb-4 flex items-center gap-2 print:hidden">
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
            {data.typeLabel}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-tertiary">
            {EXPORT_FORMAT_LABELS[data.format]}
          </span>
          <span className="text-xs text-tertiary">
            {new Date(data.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface px-8 py-6 print:border-0 print:px-0 print:py-0">
          <MarkdownRenderer content={data.content} />
        </div>

        <footer className="mt-6 text-center text-xs text-tertiary print:hidden">
          由 AI 任务管家生成 · {data.goalTitle}
        </footer>
      </article>
    </main>
  );
}

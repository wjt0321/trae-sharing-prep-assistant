"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useWorkspace } from "@/lib/workspace";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function WorkspacesPage() {
  const { workspaces, refreshWorkspaces } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/workspaces", {
        name,
        type: "team",
        description: description || undefined,
      });
      await refreshWorkspaces();
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "创建失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between animate-rise">
        <div>
          <h1 className="text-2xl font-semibold text-ink">工作区</h1>
          <p className="mt-1 text-sm text-secondary">
            管理你的个人和团队工作区
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "取消" : "创建工作区"}
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm animate-rise"
        >
          <Input
            label="工作区名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：产品团队"
            required
          />
          <Input
            label="描述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简单描述这个工作区的用途"
          />
          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "创建中..." : "创建"}
          </Button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {workspaces.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-tertiary">
              还没有工作区，点击上方按钮创建一个
            </p>
          </div>
        )}
        {workspaces.map((ws) => (
          <Link
            key={ws.id}
            href={`/app/workspaces/${ws.id}`}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-5 shadow-sm hover:border-accent transition-colors animate-rise"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">{ws.name}</h2>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-tertiary">
                  {ws.type === "personal" ? "个人" : "团队"}
                </span>
              </div>
              {ws.description && (
                <p className="mt-1 text-sm text-secondary">{ws.description}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-tertiary">
                <span>{ws.memberCount} 位成员</span>
                <span>·</span>
                <span>你的角色：{ws.currentRole}</span>
              </div>
            </div>
            <svg
              className="h-4 w-4 text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        ))}
      </div>
    </main>
  );
}

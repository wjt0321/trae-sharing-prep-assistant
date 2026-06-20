"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/Button";

export default function AppHomePage() {
  const { user } = useAuth();
  const { currentWorkspace, loading } = useWorkspace();

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-tertiary">加载中...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="animate-rise">
        <h1 className="text-2xl font-semibold text-ink">
          你好，{user?.displayName}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          从这里开始，把想法变成可推进的步骤
        </p>
      </div>

      {currentWorkspace && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm animate-rise">
            <h2 className="text-base font-semibold text-ink">
              当前工作区
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {currentWorkspace.name}
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-tertiary">
              <span>
                {currentWorkspace.type === "personal" ? "个人工作区" : "团队工作区"}
              </span>
              <span>·</span>
              <span>{currentWorkspace.memberCount} 位成员</span>
              <span>·</span>
              <span>角色：{currentWorkspace.currentRole}</span>
            </div>
            <Link href={`/app/workspaces/${currentWorkspace.id}`}>
              <Button variant="secondary" size="sm" className="mt-4">
                查看详情
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm animate-rise">
            <h2 className="text-base font-semibold text-ink">快速开始</h2>
            <p className="mt-1 text-sm text-secondary">
              后续将在此创建目标、生成规划、推进任务
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <span className="text-tertiary">目标创建器 · 规划引擎 · 执行工作台</span>
              <span className="text-xs text-tertiary">即将推出</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

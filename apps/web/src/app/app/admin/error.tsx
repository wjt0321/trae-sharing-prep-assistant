"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * 管理后台错误边界
 * 子组件抛出异常时展示友好错误页，避免整个页面白屏
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("管理后台错误:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center animate-rise">
        <h2 className="text-lg font-semibold text-danger">管理后台加载出错</h2>
        <p className="mt-2 text-sm text-secondary">
          {error.message || "发生了未知错误，请尝试刷新页面"}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} size="sm">
            重试
          </Button>
          <a href="/app">
            <Button variant="secondary" size="sm">
              返回首页
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

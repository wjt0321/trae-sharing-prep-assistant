"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/NotificationBell";

export function TopBar() {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const [wsDropdown, setWsDropdown] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      {/* 左侧：Logo + 工作区切换 */}
      <div className="flex items-center gap-4">
        <Link href="/app" className="flex items-center gap-2">
          <span className="text-base font-semibold text-ink">AI 任务管家</span>
        </Link>

        {currentWorkspace && (
          <div ref={wsRef} className="relative">
            <button
              onClick={() => setWsDropdown(!wsDropdown)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-secondary hover:bg-muted transition-colors"
            >
              <span className="font-medium text-ink">
                {currentWorkspace.name}
              </span>
              {currentWorkspace.type === "personal" && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-tertiary">
                  个人
                </span>
              )}
              <svg
                className="h-3.5 w-3.5 text-tertiary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {wsDropdown && (
              <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-border bg-surface py-1 shadow-lg z-50">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setWsDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors ${
                      ws.id === currentWorkspace.id
                        ? "text-accent"
                        : "text-ink"
                    }`}
                  >
                    <span>{ws.name}</span>
                    <span className="text-xs text-tertiary">
                      {ws.memberCount} 人
                    </span>
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <Link
                  href="/app/workspaces"
                  onClick={() => setWsDropdown(false)}
                  className="block px-3 py-2 text-sm text-accent hover:bg-muted transition-colors"
                >
                  管理工作区
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 右侧：导航 + 用户菜单 */}
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1">
          <Link
            href="/app"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname === "/app"
                ? "bg-muted text-ink font-medium"
                : "text-secondary hover:bg-muted"
            }`}
          >
            首页
          </Link>
          <Link
            href="/app/goals"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname?.startsWith("/app/goals")
                ? "bg-muted text-ink font-medium"
                : "text-secondary hover:bg-muted"
            }`}
          >
            目标
          </Link>
          <Link
            href="/app/templates"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname?.startsWith("/app/templates")
                ? "bg-muted text-ink font-medium"
                : "text-secondary hover:bg-muted"
            }`}
          >
            模板库
          </Link>
          <Link
            href="/app/assets"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname?.startsWith("/app/assets")
                ? "bg-muted text-ink font-medium"
                : "text-secondary hover:bg-muted"
            }`}
          >
            知识库
          </Link>
          <Link
            href="/app/workspaces"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname?.startsWith("/app/workspaces")
                ? "bg-muted text-ink font-medium"
                : "text-secondary hover:bg-muted"
            }`}
          >
            工作区
          </Link>
        </nav>

        <NotificationBell />

        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserMenu(!userMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
              {user?.displayName?.charAt(0) ?? "U"}
            </span>
            <span className="text-sm text-ink">{user?.displayName}</span>
          </button>

          {userMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-surface py-1 shadow-lg z-50">
              <div className="border-b border-border px-3 py-2">
                <p className="text-sm font-medium text-ink">
                  {user?.displayName}
                </p>
                <p className="truncate text-xs text-tertiary">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-muted transition-colors"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

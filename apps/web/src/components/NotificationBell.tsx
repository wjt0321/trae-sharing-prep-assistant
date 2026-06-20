"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  type NotificationResponseDto,
  type UnreadCountResponseDto,
} from "@ai-task-manager/shared";

// ============================================================
// 通知铃铛组件（嵌入 TopBar）
// ============================================================
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 获取未读数
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await api.get<UnreadCountResponseDto>("/notifications/unread-count");
      setUnreadCount(data.count);
    } catch {
      // 静默失败
    }
  }, []);

  // 获取最近通知
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<NotificationResponseDto[]>("/notifications?limit=8");
      setNotifications(data);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载 + 定时轮询未读数
  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000); // 30 秒轮询
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 打开下拉时加载通知列表
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // 标记单条已读
  async function handleMarkAsRead(id: string) {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // 静默失败
    }
  }

  // 全部已读
  async function handleMarkAllAsRead() {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      // 静默失败
    }
  }

  // 点击通知项跳转
  function handleNotificationClick(n: NotificationResponseDto) {
    if (!n.isRead) {
      handleMarkAsRead(n.id);
    }
    setOpen(false);
    // 根据目标类型跳转
    if (n.targetType === "task" && n.targetId) {
      // 任务没有独立页，跳转到目标执行工作台（需要 goalId，通知里没有，先跳通知中心）
      router.push("/app/notifications");
    } else if (n.targetType === "plan" && n.targetId) {
      router.push("/app/notifications");
    } else if (n.targetType === "comment" && n.targetId) {
      router.push("/app/notifications");
    } else {
      router.push("/app/notifications");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-muted transition-colors"
        aria-label="通知"
      >
        {/* 铃铛图标 */}
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* 未读计数徽章 */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉通知面板 */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface shadow-lg z-50">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-ink">通知</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                全部已读
              </button>
            )}
          </div>

          {/* 通知列表 */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-tertiary">
                加载中...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-tertiary">
                暂无通知
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left hover:bg-muted transition-colors last:border-b-0 ${
                    !n.isRead ? "bg-accent/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm ${!n.isRead ? "font-medium text-ink" : "text-secondary"}`}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                  <span className="text-xs text-tertiary line-clamp-2">{n.content}</span>
                  <span className="text-xs text-tertiary">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* 底部链接 */}
          <div className="border-t border-border px-4 py-2">
            <Link
              href="/app/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-accent hover:text-accent-hover transition-colors"
            >
              查看全部通知
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 相对时间格式化
// ============================================================
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return new Date(isoString).toLocaleDateString("zh-CN");
}

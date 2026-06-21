"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  type NotificationResponseDto,
  type UnreadCountResponseDto,
} from "@ai-task-manager/shared";

// ============================================================
// 通知中心页面
// ============================================================
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationResponseDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listData, countData] = await Promise.all([
        api.get<NotificationResponseDto[]>(
          `/notifications?limit=50${filter === "unread" ? "&unreadOnly=true" : ""}`,
        ),
        api.get<UnreadCountResponseDto>("/notifications/unread-count"),
      ]);
      setNotifications(listData);
      setUnreadCount(countData.count);
    } catch {
      setError("加载通知失败");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // 删除通知
  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // 静默失败
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 页头 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">通知中心</h1>
          <p className="mt-1 text-sm text-tertiary">
            {unreadCount > 0 ? `你有 ${unreadCount} 条未读通知` : "所有通知已读"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-secondary hover:bg-muted transition-colors"
          >
            全部标记已读
          </button>
        )}
      </div>

      {/* 筛选 Tab */}
      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          onClick={() => setFilter("all")}
          className={`border-b-2 px-4 py-2 text-sm transition-colors ${
            filter === "all"
              ? "border-accent text-ink font-medium"
              : "border-transparent text-tertiary hover:text-secondary"
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`border-b-2 px-4 py-2 text-sm transition-colors ${
            filter === "unread"
              ? "border-accent text-ink font-medium"
              : "border-transparent text-tertiary hover:text-secondary"
          }`}
        >
          未读 {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* 通知列表 */}
      {loading ? (
        <div className="py-16 text-center text-sm text-tertiary">加载中...</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-danger">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center">
          <img
            src="/icons/ico-empty-notification.png"
            alt=""
            aria-hidden
            className="mx-auto mb-3 h-16 w-16 object-contain"
          />
          <p className="text-sm text-tertiary">
            {filter === "unread" ? "没有未读通知" : "暂无通知"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`group relative rounded-lg border border-border bg-surface p-4 transition-colors hover:border-tertiary/30 ${
                !n.isRead ? "border-l-2 border-l-accent" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${!n.isRead ? "font-medium text-ink" : "text-secondary"}`}
                    >
                      {n.title}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-tertiary">
                      {n.typeLabel}
                    </span>
                    {!n.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-secondary">{n.content}</p>
                  <p className="mt-2 text-xs text-tertiary">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="rounded px-2 py-1 text-xs text-secondary hover:bg-muted transition-colors"
                      title="标记已读"
                    >
                      已读
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(n.id, e)}
                    className="rounded px-2 py-1 text-xs text-danger hover:bg-muted transition-colors"
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
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

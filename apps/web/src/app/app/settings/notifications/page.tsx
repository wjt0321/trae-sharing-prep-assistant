"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageContainer";

// ============================================================
// 通知偏好设置页
// ============================================================

interface NotificationPrefs {
  commentMention: boolean;
  commentReply: boolean;
  taskAssigned: boolean;
  taskStatusChanged: boolean;
  planReplanned: boolean;
  emailDigest: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  commentMention: true,
  commentReply: true,
  taskAssigned: true,
  taskStatusChanged: true,
  planReplanned: true,
  emailDigest: false,
};

const PREF_LABELS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "commentMention", label: "评论提及", description: "当有人在评论中 @你 时通知" },
  { key: "commentReply", label: "评论回复", description: "当有人回复你的评论时通知" },
  { key: "taskAssigned", label: "任务指派", description: "当有任务指派给你时通知" },
  { key: "taskStatusChanged", label: "任务状态变更", description: "当你的任务状态发生变化时通知" },
  { key: "planReplanned", label: "规划重规划", description: "当工作区目标被重新规划时通知" },
  { key: "emailDigest", label: "邮件摘要", description: "每周接收一次工作区动态摘要（即将上线）" },
];

const STORAGE_KEY = "atm_notification_prefs";

export default function NotificationSettingsPage() {
  const { success } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      }
    } catch {
      // 忽略解析错误
    }
  }, []);

  function handleToggle(key: keyof NotificationPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      success("偏好已保存");
    } catch {
      // 忽略存储错误
    }
  }

  return (
    <div>
      <PageHeader
        title="通知偏好"
        description="选择你想要接收的通知类型"
      />

      <div className="max-w-2xl space-y-1">
        {PREF_LABELS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="mt-0.5 text-xs text-tertiary">{item.description}</p>
            </div>
            <Toggle
              checked={prefs[item.key]}
              onChange={() => handleToggle(item.key)}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-2xl rounded-lg border border-border bg-muted/50 px-4 py-3">
        <p className="text-xs text-tertiary">
          通知偏好保存在本地浏览器中。未来将支持服务端同步和邮件推送。
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Toggle 开关组件
// ============================================================

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-1"
        }`}
        style={{ transform: checked ? "translateX(18px)" : "translateX(3px)" }}
      />
    </button>
  );
}

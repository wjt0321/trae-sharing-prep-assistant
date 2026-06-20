"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageContainer";

// ============================================================
// 个人资料设置页
// ============================================================

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      error("昵称不能为空");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/auth/me", {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
      await refreshUser();
      success("资料已更新");
    } catch {
      error("更新失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="个人资料" description="管理你的账号信息" />

      <form onSubmit={handleSave} className="max-w-md space-y-5">
        {/* 邮箱（只读） */}
        <Input label="邮箱" value={user?.email ?? ""} disabled />

        {/* 昵称 */}
        <Input
          label="昵称"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="输入你的昵称"
          maxLength={32}
        />

        {/* 头像 URL */}
        <Input
          label="头像链接"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.png"
          type="url"
        />

        {/* 头像预览 */}
        {avatarUrl && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-tertiary">预览：</span>
            <img
              src={avatarUrl}
              alt="头像预览"
              className="h-12 w-12 rounded-full border border-border object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "保存中..." : "保存修改"}
        </Button>
      </form>
    </div>
  );
}

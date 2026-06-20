"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageContainer";

// ============================================================
// 密码与安全设置页
// ============================================================

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      error("请填写所有字段");
      return;
    }
    if (newPassword.length < 6) {
      error("新密码至少 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      error("两次输入的新密码不一致");
      return;
    }

    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      success("密码已修改，请重新登录");
      // 修改密码后 session 已吊销，跳转登录页
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "修改失败，请检查当前密码";
      error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="密码与安全" description="修改你的登录密码" />

      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        <Input
          label="当前密码"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="输入当前密码"
          autoComplete="current-password"
        />

        <Input
          label="新密码"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="至少 6 位"
          autoComplete="new-password"
          error={newPassword && newPassword.length < 6 ? "密码至少 6 位" : undefined}
        />

        <Input
          label="确认新密码"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="再次输入新密码"
          autoComplete="new-password"
          error={
            confirmPassword && confirmPassword !== newPassword
              ? "两次输入不一致"
              : undefined
          }
        />

        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
          <p className="text-xs text-tertiary">
            修改密码后，所有设备的登录状态将失效，需要重新登录。
          </p>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "修改中..." : "修改密码"}
        </Button>
      </form>
    </div>
  );
}

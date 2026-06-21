"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/lib/workspace";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Empty } from "@/components/ui/Empty";
import { PageHeader } from "@/components/layout/PageContainer";
import { Modal } from "@/components/ui/Modal";

// ============================================================
// 工作区成员设置页
// ============================================================

interface Member {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  joinedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  editor: "编辑者",
  viewer: "查看者",
};

const ROLE_COLORS: Record<string, "accent" | "success" | "default" | "info"> = {
  owner: "accent",
  admin: "success",
  editor: "default",
  viewer: "info",
};

export default function WorkspaceSettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const { success, error } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canManage = ["owner", "admin"].includes(currentWorkspace?.currentRole ?? "");

  const loadMembers = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const data = await api.get<Member[]>(
        `/workspaces/${currentWorkspace.id}/members`,
      );
      setMembers(data);
    } catch {
      error("加载成员列表失败");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, error]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleInvite() {
    if (!currentWorkspace || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      success(`邀请已发送至 ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("editor");
      setInviteOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "邀请失败";
      error(msg);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(member: Member) {
    if (!currentWorkspace) return;
    setRemovingId(member.userId);
    try {
      await api.delete(
        `/workspaces/${currentWorkspace.id}/members/${member.userId}`,
      );
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      success(`已移除 ${member.displayName}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "移除失败";
      error(msg);
    } finally {
      setRemovingId(null);
    }
  }

  if (!currentWorkspace) {
    return (
      <div>
        <PageHeader title="工作区成员" />
        <Empty title="请先选择一个工作区" icon="/icons/ico-empty-workspace.png" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="工作区成员"
        description={`${currentWorkspace.name} · 共 ${members.length} 人`}
        actions={
          canManage && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              邀请成员
            </Button>
          )
        }
      />

      {/* 成员列表 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-tertiary">加载中...</div>
      ) : members.length === 0 ? (
        <Empty title="暂无成员" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-secondary">成员</th>
                <th className="px-4 py-3 text-left font-medium text-secondary">邮箱</th>
                <th className="px-4 py-3 text-left font-medium text-secondary">角色</th>
                <th className="px-4 py-3 text-left font-medium text-secondary">加入时间</th>
                {canManage && <th className="px-4 py-3 text-right font-medium text-secondary">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
                        {m.displayName.charAt(0)}
                      </span>
                      <span className="font-medium text-ink">{m.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-tertiary">{m.email}</td>
                  <td className="px-4 py-3">
                    <Tag color={ROLE_COLORS[m.role] ?? "default"}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Tag>
                  </td>
                  <td className="px-4 py-3 text-tertiary">
                    {new Date(m.joinedAt).toLocaleDateString("zh-CN")}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {m.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(m)}
                          disabled={removingId === m.userId}
                          className="text-xs text-danger hover:underline disabled:opacity-50"
                        >
                          {removingId === m.userId ? "移除中..." : "移除"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 邀请弹窗 */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="邀请成员"
        description={`邀请用户加入「${currentWorkspace.name}」`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              取消
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "发送中..." : "发送邀请"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="邮箱地址"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="输入被邀请人的邮箱"
          />
          <Select
            label="角色"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={[
              { label: "管理员 - 可管理成员和内容", value: "admin" },
              { label: "编辑者 - 可编辑内容", value: "editor" },
              { label: "查看者 - 只读", value: "viewer" },
            ]}
          />
          <p className="text-xs text-tertiary">
            被邀请人需要先注册账号，邀请链接 7 天内有效。
          </p>
        </div>
      </Modal>
    </div>
  );
}

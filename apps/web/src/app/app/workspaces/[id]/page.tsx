"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Member {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  joinedAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  editor: "编辑者",
  viewer: "查看者",
};

export default function WorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 邀请表单
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const canManage =
    currentWorkspace?.currentRole === "owner" ||
    currentWorkspace?.currentRole === "admin";

  async function loadData() {
    setLoading(true);
    try {
      const [memberList, inviteList] = await Promise.all([
        api.get<Member[]>(`/workspaces/${params.id}/members`),
        canManage
          ? api.get<Invite[]>(`/workspaces/${params.id}/invites`)
          : Promise.resolve([]),
      ]);
      setMembers(memberList);
      setInvites(inviteList);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "加载失败",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviting(true);
    try {
      await api.post(`/workspaces/${params.id}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("viewer");
      setShowInvite(false);
      await loadData();
    } catch (err) {
      setInviteError(
        err instanceof ApiError ? err.message : "邀请失败",
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("确定要移除该成员吗？")) return;
    try {
      await api.delete(`/workspaces/${params.id}/members/${userId}`);
      await loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "移除失败");
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-tertiary">加载中...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/app/workspaces">
          <Button variant="secondary" size="sm" className="mt-4">
            返回工作区列表
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="animate-rise">
        <Link
          href="/app/workspaces"
          className="text-sm text-tertiary hover:text-secondary"
        >
          ← 返回工作区列表
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-ink">
          {currentWorkspace?.name ?? "工作区详情"}
        </h1>
        {currentWorkspace?.description && (
          <p className="mt-1 text-sm text-secondary">
            {currentWorkspace.description}
          </p>
        )}
      </div>

      {/* 成员列表 */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">
            成员（{members.length}）
          </h2>
          {canManage && (
            <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
              {showInvite ? "取消" : "邀请成员"}
            </Button>
          )}
        </div>

        {showInvite && (
          <form
            onSubmit={handleInvite}
            className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm animate-rise"
          >
            <Input
              label="邀请邮箱"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="member@example.com"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">角色</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="admin">管理员</option>
                <option value="editor">编辑者</option>
                <option value="viewer">查看者</option>
              </select>
            </div>
            {inviteError && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {inviteError}
              </p>
            )}
            <Button type="submit" size="md" disabled={inviting}>
              {inviting ? "发送中..." : "发送邀请"}
            </Button>
          </form>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
                  {m.displayName.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {m.displayName}
                  </p>
                  <p className="text-xs text-tertiary">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-secondary">
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                {canManage && m.role !== "owner" && (
                  <button
                    onClick={() => handleRemoveMember(m.userId)}
                    className="text-xs text-danger hover:underline"
                  >
                    移除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 待接受邀请 */}
      {canManage && invites.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-ink">
            待接受邀请（{invites.length}）
          </h2>
          <div className="mt-4 flex flex-col gap-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-ink">{inv.email}</p>
                  <p className="text-xs text-tertiary">
                    角色：{ROLE_LABELS[inv.role] ?? inv.role} · 过期时间：
                    {new Date(inv.expiresAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <code className="text-xs text-tertiary">{inv.token.slice(0, 8)}...</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Tag } from "@/components/ui/Tag";
import { PageHeader } from "@/components/layout/PageContainer";

// ============================================================
// 提示词模板管理页（Prompt Registry）
//
// 功能：
// - 列出所有活跃提示词模板
// - 新建 / 编辑（创建新版本）/ 删除
// - 渲染预览（传入变量值，查看拼装后的 messages）
// ============================================================

interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  userTemplate: string;
  variables: string[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RenderedPrompt {
  name: string;
  version: number;
  messages: Array<{ role: string; content: string }>;
}

export default function PromptsSettingsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);

  // 编辑/新建弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    userTemplate: "",
    variables: "",
  });
  const [saving, setSaving] = useState(false);

  // 渲染预览弹窗
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewing, setPreviewing] = useState<PromptTemplate | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<RenderedPrompt | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PromptTemplate[]>("/prompts");
      setPrompts(data);
    } catch {
      error("加载提示词模板失败");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", systemPrompt: "", userTemplate: "", variables: "" });
    setEditOpen(true);
  }

  function openEdit(prompt: PromptTemplate) {
    setEditing(prompt);
    setForm({
      name: prompt.name,
      description: prompt.description ?? "",
      systemPrompt: prompt.systemPrompt,
      userTemplate: prompt.userTemplate,
      variables: prompt.variables.join(", "),
    });
    setEditOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.systemPrompt.trim() || !form.userTemplate.trim()) {
      error("模板名、系统提示词、用户提示词模板不能为空");
      return;
    }
    setSaving(true);
    try {
      const variables = form.variables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (editing) {
        await api.put<PromptTemplate>(`/prompts/${editing.id}`, {
          description: form.description.trim() || undefined,
          systemPrompt: form.systemPrompt,
          userTemplate: form.userTemplate,
          variables,
        });
        success("提示词模板已更新（新版本）");
      } else {
        await api.post<PromptTemplate>("/prompts", {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          systemPrompt: form.systemPrompt,
          userTemplate: form.userTemplate,
          variables,
        });
        success("提示词模板已创建");
      }
      setEditOpen(false);
      await loadPrompts();
    } catch (err) {
      error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(prompt: PromptTemplate) {
    if (!confirm(`确认删除 ${prompt.name} v${prompt.version}？`)) return;
    try {
      await api.delete(`/prompts/${prompt.id}`);
      success("已删除");
      await loadPrompts();
    } catch (err) {
      error(err instanceof Error ? err.message : "删除失败");
    }
  }

  function openPreview(prompt: PromptTemplate) {
    setPreviewing(prompt);
    const initialVars: Record<string, string> = {};
    prompt.variables.forEach((v) => (initialVars[v] = ""));
    setPreviewVars(initialVars);
    setPreviewResult(null);
    setPreviewOpen(true);
  }

  async function handlePreview() {
    if (!previewing) return;
    setPreviewLoading(true);
    try {
      const result = await api.post<RenderedPrompt>(
        `/prompts/by-name/${encodeURIComponent(previewing.name)}/render`,
        { variables: previewVars },
      );
      setPreviewResult(result);
    } catch (err) {
      error(err instanceof Error ? err.message : "渲染失败");
    } finally {
      setPreviewLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="提示词模板" description="管理 AI 调用使用的提示词" />
        <div className="py-8 text-center text-tertiary">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="提示词模板"
        description="管理 AI 调用使用的提示词，支持变量占位符 {{var}} 与版本管理"
        actions={<Button onClick={openCreate}>新建模板</Button>}
      />

      {prompts.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface py-12 text-center">
          <p className="text-sm text-tertiary">暂无提示词模板</p>
          <Button onClick={openCreate} variant="secondary" className="mt-3">
            新建第一个模板
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-ink">{prompt.name}</h3>
                    <Tag color="info">v{prompt.version}</Tag>
                    {prompt.isActive && <Tag color="success">活跃</Tag>}
                  </div>
                  {prompt.description && (
                    <p className="mt-1 text-xs text-tertiary">{prompt.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {prompt.variables.map((v) => (
                      <code
                        key={v}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs text-secondary"
                      >
                        {`{{${v}}}`}
                      </code>
                    ))}
                    {prompt.variables.length === 0 && (
                      <span className="text-xs text-tertiary">无变量</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => openPreview(prompt)}
                    className="px-2 py-1 text-xs"
                  >
                    预览
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => openEdit(prompt)}
                    className="px-2 py-1 text-xs"
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(prompt)}
                    className="px-2 py-1 text-xs text-danger"
                  >
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? `编辑 ${editing.name}` : "新建提示词模板"}
        description={editing ? "保存后将创建新版本，旧版本自动归档" : undefined}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="模板名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="如 goal.detect_scenario"
            disabled={!!editing}
          />
          <Input
            label="描述"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="便于管理的简短说明"
          />
          <Textarea
            label="系统提示词"
            value={form.systemPrompt}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
            placeholder="你是..."
            rows={3}
          />
          <Textarea
            label="用户提示词模板"
            value={form.userTemplate}
            onChange={(e) => setForm({ ...form, userTemplate: e.target.value })}
            placeholder={"目标：{{topic}}\n场景：{{scenarioType}}"}
            rows={4}
          />
          <Input
            label="变量名（逗号分隔）"
            value={form.variables}
            onChange={(e) => setForm({ ...form, variables: e.target.value })}
            placeholder="topic, scenarioType"
          />
          <p className="text-xs text-tertiary">
            在用户提示词模板中使用 {`{{变量名}}`} 作为占位符，调用时由系统自动替换
          </p>
        </div>
      </Modal>

      {/* 渲染预览弹窗 */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewing ? `渲染预览：${previewing.name}` : ""}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              关闭
            </Button>
            <Button onClick={handlePreview} disabled={previewLoading}>
              {previewLoading ? "渲染中..." : "渲染"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {previewing && previewing.variables.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-secondary">变量值</p>
              {previewing.variables.map((v) => (
                <Input
                  key={v}
                  label={v}
                  value={previewVars[v] ?? ""}
                  onChange={(e) =>
                    setPreviewVars({ ...previewVars, [v]: e.target.value })
                  }
                  placeholder={`{{${v}}} 的值`}
                />
              ))}
            </div>
          )}
          {previewing && previewing.variables.length === 0 && (
            <p className="text-sm text-tertiary">此模板无变量</p>
          )}
          {previewResult && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-secondary">
                渲染结果（v{previewResult.version}）
              </p>
              {previewResult.messages.map((msg, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted p-3">
                  <p className="mb-1 text-xs font-medium text-tertiary">
                    {msg.role === "system" ? "系统" : "用户"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-ink">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, tokenStorage } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/layout/PageContainer";

// ============================================================
// AI 网关配置页
//
// 设计原则：
// - 不硬编码：URL / API Key / 模型名由用户在此页设置
// - 隐式存储：配置加密存入数据库，不落明文配置文件
// - 不主动泄露：API Key 读取时掩码，输入框为密码类型
//
// 面板：
// 1. 配置表单（服务商/URL/Key/模型）
// 2. 流式对话试用（SSE 实时展示）
// 3. 调用统计（成本/token/调用次数）
// ============================================================

interface AiConfig {
  configured: boolean;
  provider: string;
  baseUrl: string;
  modelName: string;
  apiKeyMasked: string;
  isActive: boolean;
  updatedAt: string | null;
}

interface TestResult {
  connected: boolean;
  durationMs: number;
  sampleContent: string;
  errorMessage: string | null;
}

interface AiCallStats {
  days: number;
  totalCalls: number;
  totalSuccess: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgDurationMs: number;
  byModel: Array<{
    model: string;
    callCount: number;
    successCount: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }>;
  byDay: Array<{
    date: string;
    callCount: number;
    successCount: number;
    costUsd: number;
  }>;
  byPrompt: Array<{
    promptName: string;
    callCount: number;
    avgDurationMs: number;
  }>;
}

const PROVIDER_OPTIONS = [
  { label: "OpenAI 兼容", value: "openai" },
  { label: "Anthropic（兼容代理）", value: "anthropic" },
  { label: "自定义", value: "custom" },
];

// 默认示例使用 DeepSeek（OpenAI 兼容协议）
// 用户可自行替换为其他服务商，URL/Key/模型名均不硬编码在代码逻辑中
const PROVIDER_PRESETS: Record<string, { baseUrl: string; modelName: string }> = {
  openai: { baseUrl: "https://api.deepseek.com", modelName: "deepseek-v4-flash" },
  anthropic: { baseUrl: "https://api.deepseek.com/anthropic", modelName: "deepseek-v4-flash" },
  custom: { baseUrl: "", modelName: "" },
};

export default function AiConfigSettingsPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [config, setConfig] = useState<AiConfig | null>(null);
  const [provider, setProvider] = useState("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 流式对话试用
  const [streamInput, setStreamInput] = useState("你好，请用一句话介绍你自己。");
  const [streamOutput, setStreamOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  // 调用统计
  const [stats, setStats] = useState<AiCallStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDays, setStatsDays] = useState(30);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AiConfig>("/ai-config");
      setConfig(data);
      if (data.configured) {
        setProvider(data.provider);
        setBaseUrl(data.baseUrl);
        setModelName(data.modelName);
      }
    } catch {
      error("加载配置失败");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  function handleProviderChange(value: string) {
    setProvider(value);
    const preset = PROVIDER_PRESETS[value];
    if (preset && !config?.configured) {
      setBaseUrl(preset.baseUrl);
      setModelName(preset.modelName);
    }
  }

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    if (!baseUrl.trim() || !apiKey.trim() || !modelName.trim()) {
      error("请先填写地址、API Key 和模型名");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.post<TestResult>("/ai-config/test", {
        provider,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        modelName: modelName.trim(),
      });
      setTestResult(result);
      if (result.connected) {
        success("连接测试成功");
      } else {
        error(`连接失败：${result.errorMessage}`);
      }
    } catch (err) {
      setTestResult({
        connected: false,
        durationMs: 0,
        sampleContent: "",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!baseUrl.trim() || !apiKey.trim() || !modelName.trim()) {
      error("地址、API Key 和模型名不能为空");
      return;
    }
    setSaving(true);
    try {
      const data = await api.put<AiConfig>("/ai-config", {
        provider,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        modelName: modelName.trim(),
      });
      setConfig(data);
      setApiKey("");
      success("AI 网关配置已保存");
    } catch {
      error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!confirm("确认清除 AI 网关配置？清除后将回退到 mock 模式。")) return;
    setClearing(true);
    try {
      await api.delete("/ai-config");
      setConfig(null);
      setApiKey("");
      setTestResult(null);
      success("配置已清除，已回退到 mock 模式");
      await loadConfig();
    } catch {
      error("清除失败，请重试");
    } finally {
      setClearing(false);
    }
  }

  // 流式对话（SSE）
  async function handleStream() {
    if (!streamInput.trim()) {
      error("请输入对话内容");
      return;
    }
    setStreaming(true);
    setStreamOutput("");
    const abort = new AbortController();
    streamAbortRef.current = abort;

    try {
      const token = tokenStorage.getAccess();
      const res = await fetch("/api/server/ai-config/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: streamInput.trim() }],
        }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          try {
            const data = JSON.parse(trimmed.slice(5).trim());
            if (data.content) {
              setStreamOutput((prev) => prev + data.content);
            }
            if (data.error) {
              error(`流式错误：${data.error}`);
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        error(err instanceof Error ? err.message : "流式调用失败");
      }
    } finally {
      setStreaming(false);
      streamAbortRef.current = null;
    }
  }

  function handleStopStream() {
    streamAbortRef.current?.abort();
  }

  // 调用统计
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<AiCallStats>(`/ai-config/stats?days=${statsDays}`);
      setStats(data);
    } catch {
      error("加载统计失败");
    } finally {
      setStatsLoading(false);
    }
  }, [statsDays, error]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div>
        <PageHeader title="AI 网关" description="配置 AI 服务商连接" />
        <div className="py-8 text-center text-tertiary">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="AI 网关" description="配置 AI 服务商连接，支持 OpenAI 兼容协议" />

      {/* 当前状态 */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            config?.configured ? "bg-success" : "bg-tertiary"
          }`}
        />
        <span className="text-sm text-secondary">
          {config?.configured
            ? `已接入真实模型（${config.modelName}）`
            : "当前为 mock 模式（未配置真实模型）"}
        </span>
      </div>

      <form onSubmit={handleSave} className="max-w-lg space-y-5">
        {/* 服务商 */}
        <Select
          label="服务商"
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          options={PROVIDER_OPTIONS}
        />

        {/* 接口地址 */}
        <Input
          label="接口地址（Base URL）"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.deepseek.com"
          type="url"
        />
        <p className="-mt-3 text-xs text-tertiary">
          OpenAI 兼容协议，将自动拼接 <code className="text-secondary">/chat/completions</code>
        </p>

        {/* API Key */}
        <div>
          <div className="relative">
            <Input
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                config?.configured
                  ? `已配置（${config.apiKeyMasked}），输入新值则覆盖`
                  : "sk-..."
              }
              type={showApiKey ? "text" : "password"}
              maxLength={256}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-8 text-xs text-tertiary hover:text-secondary"
            >
              {showApiKey ? "隐藏" : "显示"}
            </button>
          </div>
          <p className="mt-1 text-xs text-tertiary">
            加密存储于数据库，不会以明文落盘或返回
          </p>
        </div>

        {/* 模型名 */}
        <Input
          label="模型名称"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="deepseek-v4-flash / deepseek-v4-pro"
          maxLength={128}
        />

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={saving || !apiKey.trim()}>
            {saving ? "保存中..." : "保存配置"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={testing || !baseUrl.trim() || !apiKey.trim() || !modelName.trim()}
          >
            {testing ? "测试中..." : "测试连接"}
          </Button>
          {config?.configured && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={clearing}
            >
              {clearing ? "清除中..." : "清除配置"}
            </Button>
          )}
        </div>
      </form>

      {/* 测试结果 */}
      {testResult && (
        <div
          className={`mt-6 max-w-lg rounded-lg border p-4 ${
            testResult.connected
              ? "border-success/30 bg-success/5"
              : "border-danger/30 bg-danger/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {testResult.connected ? "✓ 连接成功" : "✗ 连接失败"}
            </span>
            <span className="text-xs text-tertiary">耗时 {testResult.durationMs}ms</span>
          </div>
          {testResult.connected && testResult.sampleContent && (
            <p className="mt-2 text-sm text-secondary">
              模型回复：{testResult.sampleContent}
            </p>
          )}
          {!testResult.connected && testResult.errorMessage && (
            <p className="mt-2 text-sm text-danger">{testResult.errorMessage}</p>
          )}
        </div>
      )}

      {/* 安全说明 */}
      <div className="mt-8 max-w-lg rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-2 text-sm font-medium text-ink">安全说明</h3>
        <ul className="space-y-1 text-xs text-tertiary">
          <li>• API Key 使用 AES-256-GCM 加密后存储，不以明文落盘</li>
          <li>• 读取配置时仅返回掩码（如 ****abcd），不返回明文</li>
          <li>• API Key 仅在调用 AI 时于内存中解密，不记录到日志</li>
          <li>• 配置存储于本地 SQLite 数据库文件，不硬编码在代码中</li>
        </ul>
      </div>

      {/* 流式对话试用 */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium text-ink">流式对话试用</h3>
        <div className="max-w-lg space-y-3">
          <Textarea
            value={streamInput}
            onChange={(e) => setStreamInput(e.target.value)}
            placeholder="输入对话内容，点击发送后将流式返回"
            rows={2}
          />
          <div className="flex gap-2">
            {!streaming ? (
              <Button onClick={handleStream} disabled={!streamInput.trim()}>
                发送
              </Button>
            ) : (
              <Button variant="danger" onClick={handleStopStream}>
                停止
              </Button>
            )}
          </div>
          {streamOutput && (
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="whitespace-pre-wrap text-sm text-ink">{streamOutput}</p>
            </div>
          )}
          {!streamOutput && !streaming && (
            <p className="text-xs text-tertiary">
              {config?.configured
                ? "已接入真实模型，发送后将流式返回模型回复"
                : "当前为 mock 模式，发送后将返回模拟流式内容"}
            </p>
          )}
        </div>
      </div>

      {/* 调用统计 */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">调用统计</h3>
          <div className="flex items-center gap-2">
            <Select
              value={String(statsDays)}
              onChange={(e) => setStatsDays(Number(e.target.value))}
              options={[
                { label: "最近 7 天", value: "7" },
                { label: "最近 30 天", value: "30" },
                { label: "最近 90 天", value: "90" },
              ]}
            />
            <Button variant="ghost" onClick={loadStats} disabled={statsLoading} className="px-2 py-1 text-xs">
              刷新
            </Button>
          </div>
        </div>

        {statsLoading ? (
          <p className="py-4 text-center text-sm text-tertiary">加载中...</p>
        ) : stats && stats.totalCalls > 0 ? (
          <div className="space-y-4">
            {/* 总览 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-tertiary">调用次数</p>
                <p className="mt-1 text-lg font-semibold text-ink">{stats.totalCalls}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-tertiary">成功率</p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {stats.totalCalls > 0
                    ? Math.round((stats.totalSuccess / stats.totalCalls) * 100)
                    : 0}
                  %
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-tertiary">Token 总量</p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-tertiary">估算成本</p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  ${stats.totalCostUsd.toFixed(4)}
                </p>
              </div>
            </div>

            {/* 按模型 */}
            {stats.byModel.length > 0 && (
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="mb-2 text-xs font-medium text-secondary">按模型</p>
                <div className="space-y-2">
                  {stats.byModel.map((m) => (
                    <div key={m.model} className="flex items-center justify-between text-xs">
                      <span className="text-ink">{m.model}</span>
                      <div className="flex items-center gap-3 text-tertiary">
                        <span>{m.callCount} 次</span>
                        <span>{(m.inputTokens + m.outputTokens).toLocaleString()} token</span>
                        <span>${m.costUsd.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 按提示词 */}
            {stats.byPrompt.length > 0 && (
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="mb-2 text-xs font-medium text-secondary">按提示词</p>
                <div className="space-y-2">
                  {stats.byPrompt.map((p) => (
                    <div key={p.promptName} className="flex items-center justify-between text-xs">
                      <code className="text-secondary">{p.promptName}</code>
                      <div className="flex items-center gap-3 text-tertiary">
                        <span>{p.callCount} 次</span>
                        <span>平均 {p.avgDurationMs}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface py-8 text-center">
            <p className="text-sm text-tertiary">
              {stats ? `最近 ${stats.days} 天暂无调用记录` : "暂无统计数据"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

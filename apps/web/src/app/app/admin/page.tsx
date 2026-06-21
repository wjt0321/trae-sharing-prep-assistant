"use client";

import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { BusinessTab } from "@/components/admin/BusinessTab";
import { AuditTab } from "@/components/admin/AuditTab";

// ============================================================
// 管理后台监控页
//
// 参考：12_安全监控指标与发布治理实施清单.md
//
// 三个 Tab：
// 1. 概览：健康检查 + 系统指标
// 2. 业务指标：目标 / 规划 / 执行 / 导出 / 模板
// 3. 审计日志：关键操作流水
// ============================================================

type TabKey = "overview" | "business" | "audit";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "overview", label: "系统概览", icon: "/icons/ico-admin-overview.png" },
  { key: "business", label: "业务指标", icon: "/icons/ico-admin-business.png" },
  { key: "audit", label: "审计日志", icon: "/icons/ico-admin-audit.png" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <PageContainer size="wide">
      <PageHeader
        title="管理后台"
        description="系统监控、业务指标与审计日志"
      />

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors ${
              tab === t.key
                ? "border-accent text-accent font-medium"
                : "border-transparent text-secondary hover:text-ink"
            }`}
          >
            <img
              src={t.icon}
              alt=""
              aria-hidden
              className="h-4 w-4 object-contain"
            />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "business" && <BusinessTab />}
      {tab === "audit" && <AuditTab />}
    </PageContainer>
  );
}

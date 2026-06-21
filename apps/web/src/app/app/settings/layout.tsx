"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

// ============================================================
// 设置页布局：左侧导航 + 右侧内容
// ============================================================

const navItems = [
  { href: "/app/settings/profile", label: "个人资料", icon: "/icons/ico-profile.png" },
  { href: "/app/settings/security", label: "密码与安全", icon: "/icons/ico-security.png" },
  { href: "/app/settings/workspace", label: "工作区成员", icon: "/icons/ico-workspace-members.png" },
  { href: "/app/settings/notifications", label: "通知偏好", icon: "/icons/ico-notification.png" },
  { href: "/app/settings/ai-config", label: "AI 网关", icon: "/icons/ico-ai-gateway.png" },
  { href: "/app/settings/prompts", label: "提示词模板", icon: "/icons/ico-prompts.png" },
];

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-5xl gap-8 px-4 py-8 sm:px-6">
      {/* 侧边导航 */}
      <aside className="w-48 shrink-0">
        <h1 className="mb-4 text-lg font-semibold text-ink">设置</h1>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-muted font-medium text-ink"
                    : "text-secondary hover:bg-muted hover:text-ink"
                }`}
              >
                <img
                  src={item.icon}
                  alt=""
                  aria-hidden
                  className="h-4 w-4 shrink-0 object-contain"
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 内容区 */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

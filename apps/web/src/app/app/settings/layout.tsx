"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

// ============================================================
// 设置页布局：左侧导航 + 右侧内容
// ============================================================

const navItems = [
  { href: "/app/settings/profile", label: "个人资料", icon: "👤" },
  { href: "/app/settings/security", label: "密码与安全", icon: "🔒" },
  { href: "/app/settings/workspace", label: "工作区成员", icon: "👥" },
  { href: "/app/settings/notifications", label: "通知偏好", icon: "🔔" },
  { href: "/app/settings/ai-config", label: "AI 网关", icon: "🤖" },
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
                <span className="text-base" aria-hidden>
                  {item.icon}
                </span>
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

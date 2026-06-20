import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ============================================================
// 页面骨架规范组件
// 统一所有业务页面的容器、头部、区块结构
// ============================================================

/**
 * PageContainer - 页面最外层容器
 * 统一最大宽度 + 水平内边距 + 垂直间距
 */
export function PageContainer({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
}) {
  const maxW = {
    narrow: "max-w-2xl",
    default: "max-w-5xl",
    wide: "max-w-7xl",
  };
  return (
    <div className={cn("mx-auto w-full px-4 py-8 sm:px-6", maxW[size], className)}>
      {children}
    </div>
  );
}

/**
 * PageHeader - 页面头部
 * 统一标题 + 描述 + 右侧操作区的布局
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-tertiary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Section - 内容区块
 * 统一区块标题 + 内容的垂直间距
 */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-8 last:mb-0", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-tertiary">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

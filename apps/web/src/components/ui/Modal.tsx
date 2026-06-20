"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ============================================================
// Modal 模态框组件
// ============================================================

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** 底部操作区 */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** 点击遮罩是否关闭，默认 true */
  closeOnOverlay?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  // ESC 关闭 + 锁定滚动
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-ink/30 animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* 内容 */}
      <div
        ref={ref}
        className={cn(
          "relative w-full rounded-xl bg-surface shadow-xl animate-scale-in",
          sizeClasses[size],
        )}
      >
        {/* 头部 */}
        {(title || description) && (
          <div className="border-b border-border px-6 py-4">
            {title && (
              <h2 id="modal-title" className="text-base font-semibold text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-tertiary">{description}</p>
            )}
          </div>
        )}

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-tertiary hover:bg-muted hover:text-secondary transition-colors"
          aria-label="关闭"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 内容区 */}
        <div className="px-6 py-5">{children}</div>

        {/* 底部 */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

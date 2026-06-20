"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

// ============================================================
// Toast 类型定义
// ============================================================

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================
// Toast Provider
// ============================================================

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      // 3 秒后自动移除
      setTimeout(() => remove(id), 3000);
    },
    [remove],
  );

  const value: ToastContextValue = {
    toast,
    success: (msg) => toast(msg, "success"),
    error: (msg) => toast(msg, "error"),
    warning: (msg) => toast(msg, "warning"),
    info: (msg) => toast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

// ============================================================
// useToast hook
// ============================================================

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast 必须在 ToastProvider 内使用");
  }
  return ctx;
}

// ============================================================
// Toast 容器（固定在右上角）
// ============================================================

const typeStyles: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: "bg-success", icon: "✓" },
  error: { bg: "bg-danger", icon: "✕" },
  warning: { bg: "bg-warning", icon: "!" },
  info: { bg: "bg-info", icon: "i" },
};

function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastItem[];
  onClose: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => {
        const style = typeStyles[t.type];
        return (
          <div
            key={t.id}
            className="flex items-start gap-2.5 rounded-lg bg-surface px-4 py-3 shadow-lg border border-border animate-slide-in min-w-[260px] max-w-[400px]"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${style.bg}`}
            >
              {style.icon}
            </span>
            <p className="flex-1 text-sm text-ink pt-0.5">{t.message}</p>
            <button
              onClick={() => onClose(t.id)}
              className="text-tertiary hover:text-secondary transition-colors"
              aria-label="关闭"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

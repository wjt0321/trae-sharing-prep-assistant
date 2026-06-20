import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  /** 重试按钮回调 */
  onRetry?: () => void;
}

export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ className, title = "加载失败", description = "请稍后重试", onRetry, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-16 px-4 text-center",
          className,
        )}
        {...props}
      >
        <div className="mb-3 text-4xl" aria-hidden>
          ⚠️
        </div>
        <p className="text-sm font-medium text-danger">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-tertiary">{description}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-lg border border-border px-3 py-1.5 text-sm text-secondary hover:bg-muted transition-colors"
          >
            重试
          </button>
        )}
      </div>
    );
  },
);

ErrorState.displayName = "ErrorState";

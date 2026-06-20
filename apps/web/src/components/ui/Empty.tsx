import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface EmptyProps extends HTMLAttributes<HTMLDivElement> {
  /** 图标 emoji，默认空盒子 */
  icon?: string;
  title?: string;
  description?: string;
  /** 操作区域（通常是按钮） */
  action?: React.ReactNode;
}

export const Empty = forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, icon = "📭", title = "暂无数据", description, action, ...props }, ref) => {
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
          {icon}
        </div>
        <p className="text-sm font-medium text-secondary">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-tertiary">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  },
);

Empty.displayName = "Empty";

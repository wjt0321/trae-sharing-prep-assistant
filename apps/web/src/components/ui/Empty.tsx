import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface EmptyProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 图标：可以是 emoji 字符串，也可以是 /icons/xxx.png 形式的图片路径。
   * 默认空盒子图标。
   */
  icon?: string;
  title?: string;
  description?: string;
  /** 操作区域（通常是按钮） */
  action?: React.ReactNode;
}

// 判断是否为图片路径（以 / 开头且以图片扩展名结尾）
function isImagePath(icon: string): boolean {
  return /^\//.test(icon) && /\.(png|svg|jpg|jpeg|webp|gif)$/i.test(icon);
}

export const Empty = forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, icon = "/icons/ico-empty-default.png", title = "暂无数据", description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-16 px-4 text-center",
          className,
        )}
        {...props}
      >
        {icon && isImagePath(icon) ? (
          <img
            src={icon}
            alt=""
            aria-hidden
            className="mb-3 h-16 w-16 object-contain"
          />
        ) : (
          <div className="mb-3 text-4xl" aria-hidden>
            {icon}
          </div>
        )}
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

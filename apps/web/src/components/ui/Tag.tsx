import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TagColor = "default" | "accent" | "success" | "warning" | "danger" | "info";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  color?: TagColor;
}

const colorClasses: Record<TagColor, string> = {
  default: "bg-muted text-secondary border-border",
  accent: "bg-accent/10 text-accent border-accent/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-info/10 text-info border-info/20",
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ className, color = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
          colorClasses[color],
          className,
        )}
        {...props}
      />
    );
  },
);

Tag.displayName = "Tag";

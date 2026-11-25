import * as React from "react";
import { cn } from "@/lib/utils";

export const EmptyState = ({
  icon: IconComponent,
  title,
  description,
  action,
  size = "default",
  bordered = false,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: "sm" | "default" | "lg";
  bordered?: boolean;
  className?: string;
}) => {
  const sizeClass = {
    sm: "gap-2 py-8",
    default: "gap-3 py-14",
    lg: "min-h-[60vh] gap-3 py-16",
  }[size];
  return (
    <div data-slot="empty-state" className={cn("flex flex-col items-center justify-center px-6 text-center", sizeClass, bordered && "rounded-xl border border-dashed border-border-strong", className)}>
      {IconComponent && (
        <span className="mb-1 flex size-12 items-center justify-center rounded-full border border-border bg-surface">
          <IconComponent className="size-5 text-muted-foreground" />
        </span>
      )}
      <span className="text-[15px] font-medium tracking-[-0.01em] text-foreground">{title}</span>
      {description && <span className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</span>}
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
};

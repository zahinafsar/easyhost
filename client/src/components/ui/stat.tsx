import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type StatDelta = {
  value: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "muted";
};

const DELTA_VARIANT = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  muted: "muted",
} as const;

export const Stat = ({
  label,
  value,
  delta,
  hint,
  icon: IconComponent,
  action,
  variant = "card",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: StatDelta | null;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  variant?: "card" | "plain" | "inset";
  className?: string;
}) => {
  const variantClass = {
    card: "rounded-xl border border-border bg-card p-5",
    plain: "",
    inset: "rounded-lg border border-border bg-surface-2 p-4",
  }[variant];
  return (
    <div data-slot="stat" className={cn("flex min-w-0 flex-col gap-3", variantClass, className)}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
          {IconComponent && (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-foreground">
              <IconComponent className="size-3.5" />
            </span>
          )}
          <span className="truncate">{label}</span>
        </span>
        {action}
      </div>
      <div className="flex min-w-0 flex-wrap items-baseline gap-2">
        <span className="min-w-0 truncate text-[26px] leading-none font-medium tracking-[-0.035em] text-foreground tabular-nums">{value}</span>
        {delta && <Badge variant={DELTA_VARIANT[delta.tone ?? "success"]}>{delta.value}</Badge>}
      </div>
      {hint && <span className="min-w-0 truncate text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
};

export const StatGroup = ({ className, cols = 4, ...props }: React.HTMLAttributes<HTMLDivElement> & { cols?: 2 | 3 | 4 }) => {
  const colsClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[cols];
  return <div data-slot="stat-group" className={cn("grid grid-cols-1 gap-4", colsClass, className)} {...props} />;
};

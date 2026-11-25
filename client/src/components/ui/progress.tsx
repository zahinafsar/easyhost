import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-primary",
  success: "bg-accent-green",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
};

export const Progress = ({
  className,
  value,
  max = 100,
  tone = "success",
  size = "default",
  ...props
}: Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, "value"> & { value?: number | null; tone?: keyof typeof TONES; size?: "sm" | "default" | "lg" }) => {
  const percent = Math.max(0, Math.min(100, ((value ?? 0) / max) * 100));
  const height = { sm: "h-1", default: "h-1.5", lg: "h-2.5" }[size];
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} max={max} className={cn("relative w-full overflow-hidden rounded-full bg-muted", height, className)} {...props}>
      <ProgressPrimitive.Indicator className={cn("h-full rounded-full transition-[width] duration-500", TONES[tone])} style={{ width: `${percent}%` }} />
    </ProgressPrimitive.Root>
  );
};

export const UsageMeter = ({
  label,
  used,
  limit,
  format,
  className,
}: {
  label: React.ReactNode;
  used: number;
  limit: number;
  format?: (value: number) => string;
  className?: string;
}) => {
  let ratio = 0;
  if (limit > 0) {
    ratio = used / limit;
  }
  let tone: keyof typeof TONES = "success";
  if (ratio >= 1) {
    tone = "danger";
  } else if (ratio >= 0.8) {
    tone = "warning";
  }
  let usedText = String(used);
  let limitText = String(limit);
  if (format) {
    usedText = format(used);
    limitText = format(limit);
  }
  return (
    <div data-slot="usage-meter" className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">
          {usedText} / {limitText}
        </span>
      </div>
      <Progress value={Math.min(used, limit)} max={Math.max(limit, 1)} tone={tone} />
    </div>
  );
};

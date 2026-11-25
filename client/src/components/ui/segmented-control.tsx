import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

export const SegmentedControl = <T extends string>({
  value,
  onValueChange,
  options,
  size = "default",
  block = false,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "default";
  block?: boolean;
  className?: string;
  "aria-label"?: string;
}) => {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(next) => {
        if (next) {
          onValueChange(next as T);
        }
      }}
      data-slot="segmented-control"
      className={cn("inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface-2 p-1", block && "flex w-full", className)}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap text-muted-foreground transition-[background-color,color,box-shadow] outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-surface data-[state=on]:text-foreground dark:data-[state=on]:bg-surface-3 [&_svg]:size-3.5",
            size === "sm" && "h-7 px-3 text-xs",
            size === "default" && "h-8 px-3.5 text-[13px]",
            block && "flex-1",
          )}
        >
          {option.icon && <option.icon />}
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
};

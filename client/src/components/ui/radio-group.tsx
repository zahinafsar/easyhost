import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const RadioGroup = ({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) => {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />;
};

export const RadioGroupItem = ({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) => {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer inline-flex aspect-square size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent-green dark:bg-surface-2",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-accent-green" />
    </RadioGroupPrimitive.Item>
  );
};

export const RadioCard = ({
  value,
  title,
  description,
  icon: IconComponent,
  disabled,
  className,
}: {
  value: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  className?: string;
}) => {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-[border-color,box-shadow] outline-none hover:border-border-strong focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent-green data-[state=checked]:ring-1 data-[state=checked]:ring-accent-green dark:bg-surface-2",
        className,
      )}
    >
      {IconComponent && <IconComponent className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {description && <span className="text-[13px] leading-relaxed text-muted-foreground">{description}</span>}
      </span>
    </RadioGroupPrimitive.Item>
  );
};

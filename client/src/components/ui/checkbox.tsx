import * as React from "react";
import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Checkbox = ({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) => {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer group/checkbox inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border-strong bg-surface transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[state=checked]:border-accent-green data-[state=checked]:bg-accent-green data-[state=checked]:text-white data-[state=indeterminate]:border-accent-green data-[state=indeterminate]:bg-accent-green data-[state=indeterminate]:text-white dark:bg-surface-2",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3.5 group-data-[state=indeterminate]/checkbox:hidden" strokeWidth={3} />
        <Minus className="hidden size-3.5 group-data-[state=indeterminate]/checkbox:block" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
};

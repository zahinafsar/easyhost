import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const TooltipProvider = ({ delayDuration = 200, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) => {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
};

export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = ({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) => {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
};

export const Tooltip = ({
  content,
  children,
  side = "top",
  align = "center",
  open,
  onOpenChange,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>["side"];
  align?: React.ComponentProps<typeof TooltipPrimitive.Content>["align"];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

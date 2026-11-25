import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Popover = (props: React.ComponentProps<typeof PopoverPrimitive.Root>) => {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
};

export const PopoverTrigger = (props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) => {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
};

export const PopoverAnchor = (props: React.ComponentProps<typeof PopoverPrimitive.Anchor>) => {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
};

export const PopoverClose = (props: React.ComponentProps<typeof PopoverPrimitive.Close>) => {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
};

export const PopoverContent = ({ className, align = "center", sideOffset = 8, matchTriggerWidth = false, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content> & { matchTriggerWidth?: boolean }) => {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-xl border border-border bg-popover p-2 text-popover-foreground outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          matchTriggerWidth && "w-[var(--radix-popover-trigger-width)]",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
};

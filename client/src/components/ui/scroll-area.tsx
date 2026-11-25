import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const ScrollBar = ({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) => {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border-strong" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
};

export const ScrollArea = ({
  className,
  viewportClassName,
  children,
  horizontal = false,
  viewportRef,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & { viewportClassName?: string; horizontal?: boolean; viewportRef?: React.Ref<HTMLDivElement> }) => {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport ref={viewportRef} data-slot="scroll-area-viewport" className={cn("size-full rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40", viewportClassName)}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      {horizontal && <ScrollBar orientation="horizontal" />}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
};

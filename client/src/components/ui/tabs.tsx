import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = ({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-4 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  );
};

export const tabsListVariants = cva(
  "group/tabs-list scrollbar-thin inline-flex w-fit max-w-full items-center overflow-x-auto text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "gap-0.5 rounded-lg border border-border bg-surface-2 p-1",
        line: "gap-5 rounded-none border-b border-border bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const TabsList = ({ className, variant = "default", ...props }: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) => {
  return <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariants({ variant }), className)} {...props} />;
};

export const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "group-data-[variant=default]/tabs-list:h-8 group-data-[variant=default]/tabs-list:rounded-sm group-data-[variant=default]/tabs-list:px-3.5 group-data-[variant=default]/tabs-list:data-[state=active]:bg-surface group-data-[variant=default]/tabs-list:data-[state=active]:text-foreground dark:group-data-[variant=default]/tabs-list:data-[state=active]:bg-surface-3",
        "group-data-[variant=line]/tabs-list:h-10 group-data-[variant=line]/tabs-list:px-0 group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-md after:bg-foreground after:opacity-0 after:transition-opacity group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
};

export const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("min-w-0 flex-1 outline-none", className)} {...props} />;
};

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Accordion = ({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) => {
  return <AccordionPrimitive.Root data-slot="accordion" className={cn("flex flex-col gap-3", className)} {...props} />;
};

export const AccordionItem = ({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) => {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn("overflow-hidden rounded-xl border border-border bg-card", className)} {...props} />;
};

export const AccordionTrigger = ({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) => {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion flex flex-1 cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium tracking-[-0.01em] text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:text-accent-green",
          className,
        )}
        {...props}
      >
        {children}
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-foreground transition-transform duration-200 group-data-[state=open]/accordion:rotate-180">
          <ChevronDown className="size-3.5" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};

export const AccordionContent = ({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) => {
  return (
    <AccordionPrimitive.Content data-slot="accordion-content" className="overflow-hidden text-sm text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
      <div className={cn("px-5 pb-5 leading-relaxed", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
};

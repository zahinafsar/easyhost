import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-2.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border-strong text-foreground",
        ghost: "text-muted-foreground",
        destructive: "bg-destructive-soft text-destructive-foreground",
        success: "bg-success-soft text-success-foreground",
        warning: "bg-warning-soft text-warning-foreground",
        info: "bg-info-soft text-info-foreground",
        muted: "bg-muted text-muted-foreground",
        link: "text-foreground underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean };

export const Badge = ({ className, variant = "default", asChild = false, ...props }: BadgeProps) => {
  if (asChild) {
    return <Slot.Root data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
  return <span data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />;
};

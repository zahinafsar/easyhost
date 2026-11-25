import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("flex flex-col gap-5 rounded-xl border py-6 text-card-foreground", {
  variants: {
    variant: {
      default: "border-border bg-card",
      frosted: "border-border bg-card dark:bg-card",
      inset: "border-border bg-surface-2 shadow-none",
      outline: "border-border bg-transparent shadow-none",
      inverse: "border-transparent bg-[#0a0c14] text-white dark:border-border dark:bg-surface-2",
    },
    interactive: {
      true: "transition-[box-shadow,transform,border-color] hover:border-border-strong",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    interactive: false,
  },
});

export type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants>;

export const Card = ({ className, variant, interactive, ...props }: CardProps) => {
  return <div data-slot="card" className={cn(cardVariants({ variant, interactive }), className)} {...props} />;
};

export const CardHeader = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-5",
        className,
      )}
      {...props}
    />
  );
};

export const CardTitle = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="card-title" className={cn("text-[15px] leading-tight font-medium tracking-[-0.01em]", className)} {...props} />;
};

export const CardDescription = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="card-description" className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
};

export const CardAction = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />;
};

export const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
};

export const CardFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="card-footer" className={cn("flex items-center gap-2 px-6 [.border-t]:pt-5", className)} {...props} />;
};

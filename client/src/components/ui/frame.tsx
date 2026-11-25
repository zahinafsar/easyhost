import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const frameVariants = cva("relative rounded-3xl border", {
  variants: {
    variant: {
      solid: "border-border bg-surface",
      frosted: "border-border bg-surface",
      muted: "border-border bg-surface-2",
      inverse: "border-transparent bg-[#0a0c14] text-white dark:border-border dark:bg-surface-2",
      ghost: "border-transparent bg-transparent",
    },
    padding: {
      none: "",
      sm: "p-4",
      default: "p-5 md:p-7",
      lg: "p-6 md:p-10",
    },
  },
  defaultVariants: {
    variant: "solid",
    padding: "default",
  },
});

export type FrameProps = React.ComponentProps<"div"> & VariantProps<typeof frameVariants>;

export const Frame = ({ className, variant, padding, ...props }: FrameProps) => {
  return <div data-slot="frame" className={cn(frameVariants({ variant, padding }), className)} {...props} />;
};

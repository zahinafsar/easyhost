import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const headingVariants = cva("min-w-0 font-medium text-foreground text-balance", {
  variants: {
    size: {
      display: "text-[40px] leading-[1.04] tracking-[-0.045em] sm:text-[52px]",
      "2xl": "text-[32px] leading-[1.06] tracking-[-0.04em] sm:text-[36px]",
      xl: "text-[26px] leading-[1.1] tracking-[-0.035em] sm:text-[30px]",
      lg: "text-xl leading-tight tracking-[-0.03em] sm:text-[22px]",
      md: "text-[17px] leading-snug tracking-[-0.02em]",
      sm: "text-[15px] leading-snug tracking-[-0.01em]",
      xs: "text-sm leading-snug",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      inverse: "text-white",
    },
    truncate: {
      true: "truncate",
      false: "",
    },
  },
  defaultVariants: {
    tone: "default",
    truncate: false,
  },
});

const LEVEL_SIZE = {
  1: "xl",
  2: "lg",
  3: "md",
  4: "sm",
} as const;

export type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof headingVariants> & {
    level?: 1 | 2 | 3 | 4;
    display?: boolean;
  };

export const Heading = ({ level = 2, display = false, size, tone, truncate, className, ...props }: HeadingProps) => {
  const Component = `h${level}` as "h1" | "h2" | "h3" | "h4";
  let resolvedSize = size ?? LEVEL_SIZE[level];
  if (display) {
    resolvedSize = "display";
  }
  return <Component data-slot="heading" className={cn(headingVariants({ size: resolvedSize, tone, truncate }), className)} {...props} />;
};

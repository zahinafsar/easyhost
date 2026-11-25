import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textVariants = cva("min-w-0", {
  variants: {
    size: {
      "2xs": "text-[11px] leading-4",
      xs: "text-xs leading-5",
      sm: "text-[13px] leading-relaxed",
      base: "text-sm leading-relaxed",
      md: "text-[15px] leading-relaxed",
      lg: "text-base leading-relaxed",
      xl: "text-lg leading-snug",
      inherit: "",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      subtle: "text-muted-foreground/70",
      success: "text-success-foreground",
      warning: "text-warning-foreground",
      danger: "text-destructive",
      info: "text-info-foreground",
      accent: "text-accent-green",
      inverse: "text-primary-foreground",
      inherit: "",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      inherit: "",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
    truncate: {
      true: "truncate",
      false: "",
    },
    mono: {
      true: "font-mono",
      false: "",
    },
    tabular: {
      true: "tabular-nums",
      false: "",
    },
    wrap: {
      words: "break-words",
      all: "break-all",
      pretty: "text-pretty",
      balance: "text-balance",
      nowrap: "whitespace-nowrap",
      pre: "whitespace-pre-wrap",
    },
    clamp: {
      1: "line-clamp-1",
      2: "line-clamp-2",
      3: "line-clamp-3",
    },
  },
  defaultVariants: {
    size: "base",
    tone: "default",
    weight: "normal",
    truncate: false,
    mono: false,
    tabular: false,
  },
});

export type TextElement = "p" | "span" | "div" | "strong" | "em" | "small" | "label" | "time" | "del" | "abbr";

export type TextProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    as?: TextElement;
    htmlFor?: string;
    dateTime?: string;
  };

export const Text = ({ as = "p", className, size, tone, weight, align, truncate, mono, tabular, wrap, clamp, ...props }: TextProps) => {
  const Component = as as React.ElementType;
  return <Component data-slot="text" className={cn(textVariants({ size, tone, weight, align, truncate, mono, tabular, wrap, clamp }), className)} {...props} />;
};

export const Strong = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  return <strong className={cn("font-semibold text-foreground", className)} {...props} />;
};

export const Accent = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  return <span data-slot="accent" className={cn("text-accent-green", className)} {...props} />;
};

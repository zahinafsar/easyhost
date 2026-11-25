import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

export type BoxElement = "div" | "section" | "header" | "footer" | "nav" | "aside" | "main" | "article" | "span" | "figure" | "figcaption" | "fieldset";

export type BoxProps = React.HTMLAttributes<HTMLElement> & {
  as?: BoxElement;
  asChild?: boolean;
  ref?: React.Ref<HTMLElement>;
};

export const Box = ({ as = "div", asChild = false, className, ...props }: BoxProps) => {
  if (asChild) {
    return <Slot.Root className={className} {...props} />;
  }
  const Component = as as React.ElementType;
  return <Component className={cn(className)} {...props} />;
};

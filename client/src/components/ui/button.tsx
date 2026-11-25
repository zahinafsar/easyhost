import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow,opacity,transform] duration-150 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/88",
        secondary: "border border-border bg-surface text-foreground hover:bg-surface-2",
        outline: "border border-border-strong bg-transparent text-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        success: "bg-accent-green text-white hover:bg-accent-green/90",
        link: "h-auto rounded-none px-0 text-foreground underline-offset-4 hover:underline has-[>svg]:px-0",
      },
      size: {
        default: "h-10 px-5 has-[>svg]:px-4",
        xs: "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3.5 text-[13px] has-[>svg]:px-3",
        lg: "h-12 px-7 text-[15px] has-[>svg]:px-6",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      block: false,
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export const Button = ({ className, variant = "default", size = "default", block = false, asChild = false, loading = false, disabled, children, ...props }: ButtonProps) => {
  if (asChild) {
    return (
      <Slot.Root data-slot="button" data-variant={variant} data-size={size} className={cn(buttonVariants({ variant, size, block }), className)} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
};

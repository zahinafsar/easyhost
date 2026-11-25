import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const pillVariants = cva(
  "inline-flex max-w-full items-center gap-1.5 rounded-sm border text-xs font-medium whitespace-nowrap [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      tone: {
        default: "border-border bg-surface text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        success: "border-transparent bg-success-soft text-success-foreground",
        warning: "border-transparent bg-warning-soft text-warning-foreground",
        danger: "border-transparent bg-destructive-soft text-destructive-foreground",
        info: "border-transparent bg-info-soft text-info-foreground",
        inverse: "border-transparent bg-primary text-primary-foreground",
      },
      size: {
        sm: "h-6 px-2.5",
        default: "h-7 px-3",
      },
    },
    defaultVariants: {
      tone: "default",
      size: "default",
    },
  },
);

export type PillProps = React.ComponentProps<"span"> &
  VariantProps<typeof pillVariants> & {
    icon?: React.ComponentType<{ className?: string }>;
    onRemove?: () => void;
    removeLabel?: string;
  };

export const Pill = ({ className, tone, size, icon: IconComponent, onRemove, removeLabel = "Remove", children, ...props }: PillProps) => {
  return (
    <span data-slot="pill" className={cn(pillVariants({ tone, size }), className)} {...props}>
      {IconComponent && <IconComponent />}
      <span className="min-w-0 truncate">{children}</span>
      {onRemove && (
        <button type="button" aria-label={removeLabel} onClick={onRemove} className="-mr-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-full opacity-60 hover:opacity-100">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
};

export const Tag = Pill;

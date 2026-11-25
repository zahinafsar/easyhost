import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const listVariants = cva("min-w-0", {
  variants: {
    variant: {
      plain: "flex flex-col",
      bullet: "flex list-disc flex-col pl-5 marker:text-muted-foreground",
      ordered: "flex list-decimal flex-col pl-5 marker:text-muted-foreground",
      divided: "flex flex-col divide-y divide-border",
      check: "flex flex-col",
    },
    gap: {
      0: "gap-0",
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
    },
  },
  defaultVariants: {
    variant: "plain",
    gap: 2,
  },
});

export type ListProps = React.HTMLAttributes<HTMLElement> & VariantProps<typeof listVariants>;

export const List = ({ className, variant, gap, ...props }: ListProps) => {
  let resolvedGap = gap;
  if (variant === "divided" && gap === undefined) {
    resolvedGap = 0;
  }
  if (variant === "ordered") {
    return <ol data-slot="list" data-variant={variant ?? "plain"} className={cn(listVariants({ variant, gap: resolvedGap }), className)} {...(props as React.HTMLAttributes<HTMLOListElement>)} />;
  }
  return <ul data-slot="list" data-variant={variant ?? "plain"} className={cn(listVariants({ variant, gap: resolvedGap }), className)} {...(props as React.HTMLAttributes<HTMLUListElement>)} />;
};

export const ListItem = ({ className, icon: IconComponent, children, ...props }: React.LiHTMLAttributes<HTMLLIElement> & { icon?: React.ComponentType<{ className?: string }> }) => {
  if (IconComponent) {
    return (
      <li data-slot="list-item" className={cn("flex min-w-0 items-start gap-2.5 text-sm leading-relaxed", className)} {...props}>
        <IconComponent className="mt-0.5 size-4 shrink-0 text-accent-green" />
        <span className="min-w-0 flex-1">{children}</span>
      </li>
    );
  }
  return (
    <li data-slot="list-item" className={cn("min-w-0 text-sm leading-relaxed [[data-variant=divided]>&]:py-3", className)} {...props}>
      {children}
    </li>
  );
};

export const NumberedItem = ({
  index,
  title,
  description,
  action,
  className,
}: {
  index: number;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => {
  return (
    <li data-slot="numbered-item" className={cn("flex min-w-0 items-start gap-4 border-b border-border py-5 last:border-b-0", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-xs text-muted-foreground">
        {String(index).padStart(2, "0")}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 pt-1.5 md:flex-row md:gap-6">
        <span className="min-w-0 text-[15px] font-medium tracking-[-0.01em] text-foreground md:w-2/5">{title}</span>
        {description && <span className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</span>}
      </span>
      {action && <span className="shrink-0 pt-1">{action}</span>}
    </li>
  );
};

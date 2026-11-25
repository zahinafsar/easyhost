import * as React from "react";
import { cn } from "@/lib/utils";

export type DescriptionEntry = {
  term: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
  action?: React.ReactNode;
};

export const DescriptionList = ({
  items,
  layout = "rows",
  className,
  children,
}: {
  items?: DescriptionEntry[];
  layout?: "rows" | "grid" | "stacked";
  className?: string;
  children?: React.ReactNode;
}) => {
  const layoutClass = {
    rows: "flex flex-col divide-y divide-border",
    grid: "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2",
    stacked: "flex flex-col gap-4",
  }[layout];
  return (
    <dl data-slot="description-list" data-layout={layout} className={cn("min-w-0 text-sm", layoutClass, className)}>
      {items?.map((item, index) => (
        <DescriptionItem key={index} term={item.term} mono={item.mono} action={item.action} layout={layout}>
          {item.value}
        </DescriptionItem>
      ))}
      {children}
    </dl>
  );
};

export const DescriptionItem = ({
  term,
  mono = false,
  action,
  layout = "rows",
  className,
  children,
}: {
  term: React.ReactNode;
  mono?: boolean;
  action?: React.ReactNode;
  layout?: "rows" | "grid" | "stacked";
  className?: string;
  children: React.ReactNode;
}) => {
  if (layout === "rows") {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6", className)}>
        <dt className="shrink-0 text-[13px] text-muted-foreground sm:w-44">{term}</dt>
        <dd className={cn("flex min-w-0 flex-1 items-center gap-2 break-all text-foreground", mono && "font-mono text-xs")}>
          <span className="min-w-0 flex-1">{children}</span>
          {action}
        </dd>
      </div>
    );
  }
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{term}</dt>
      <dd className={cn("flex min-w-0 items-center gap-2 break-all text-foreground", mono && "font-mono text-xs")}>
        <span className="min-w-0 flex-1">{children}</span>
        {action}
      </dd>
    </div>
  );
};

import * as React from "react";
import { Link as RouterLink } from "react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbEntry = {
  label: React.ReactNode;
  to?: string;
};

export const Breadcrumb = ({ items, className }: { items: BreadcrumbEntry[]; className?: string }) => {
  return (
    <nav aria-label="Breadcrumb" data-slot="breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 items-center gap-1.5">
              {item.to && !isLast && (
                <RouterLink to={item.to} className="truncate rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring">
                  {item.label}
                </RouterLink>
              )}
              {(!item.to || isLast) && (
                <span aria-current={isLast ? "page" : undefined} className={cn("truncate", isLast && "font-medium text-foreground")}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight aria-hidden className="size-3.5 shrink-0 opacity-60" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

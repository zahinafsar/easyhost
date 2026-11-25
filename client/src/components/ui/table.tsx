import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, framed = false, containerClassName, ...props }: React.ComponentProps<"table"> & { framed?: boolean; containerClassName?: string }) => {
  return (
    <div
      data-slot="table-container"
      className={cn("scrollbar-thin relative w-full overflow-x-auto", framed && "rounded-xl border border-border bg-card", containerClassName)}
    >
      <table data-slot="table" className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  );
};

export const TableHeader = ({ className, ...props }: React.ComponentProps<"thead">) => {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b [&_tr]:hover:bg-transparent", className)} {...props} />;
};

export const TableBody = ({ className, ...props }: React.ComponentProps<"tbody">) => {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
};

export const TableFooter = ({ className, ...props }: React.ComponentProps<"tfoot">) => {
  return <tfoot data-slot="table-footer" className={cn("border-t bg-surface-2 font-medium [&>tr]:last:border-b-0", className)} {...props} />;
};

export const TableRow = ({ className, ...props }: React.ComponentProps<"tr">) => {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b border-border transition-colors hover:bg-surface-2/70 has-aria-expanded:bg-surface-2 data-[state=selected]:bg-surface-2", className)}
      {...props}
    />
  );
};

export const TableHead = ({ className, ...props }: React.ComponentProps<"th">) => {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-4 text-left align-middle text-[11px] font-medium tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase first:pl-5 last:pr-5 [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
};

export const TableCell = ({ className, ...props }: React.ComponentProps<"td">) => {
  return <td data-slot="table-cell" className={cn("px-4 py-3.5 align-middle whitespace-nowrap first:pl-5 last:pr-5 [&:has([role=checkbox])]:pr-0", className)} {...props} />;
};

export const TableCaption = ({ className, ...props }: React.ComponentProps<"caption">) => {
  return <caption data-slot="table-caption" className={cn("mt-4 text-[13px] text-muted-foreground", className)} {...props} />;
};

export const TableEmpty = ({ colSpan, children }: { colSpan: number; children: React.ReactNode }) => {
  return (
    <tr data-slot="table-empty">
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
};

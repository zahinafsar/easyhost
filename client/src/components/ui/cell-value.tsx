import * as React from "react";
import { cn } from "@/lib/utils";

export const CellValue = ({
  editable,
  empty = false,
  title,
  onEdit,
  children,
}: {
  editable: boolean;
  empty?: boolean;
  title?: string;
  onEdit: () => void;
  children: React.ReactNode;
}) => {
  const classes = cn("block max-w-xs truncate rounded-xs px-1 -mx-1 text-left", empty && "italic text-muted-foreground");
  if (!editable) {
    return (
      <span data-slot="cell-value" className={classes} title={title}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-slot="cell-value"
      onClick={onEdit}
      title={title}
      className={cn(classes, "w-full cursor-text outline-none transition-colors hover:bg-surface-3 focus-visible:ring-[3px] focus-visible:ring-ring/40")}
    >
      {children}
    </button>
  );
};

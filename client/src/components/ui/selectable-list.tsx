import * as React from "react";
import { cn } from "@/lib/utils";

export const SelectableList = ({ className, label, children }: { className?: string; label?: string; children: React.ReactNode }) => {
  return (
    <div
      data-slot="selectable-list"
      role="listbox"
      aria-label={label}
      className={cn("scrollbar-thin flex min-w-0 flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-card p-1.5", className)}
    >
      {children}
    </div>
  );
};

export const SelectableListItem = ({
  active = false,
  onSelect,
  icon: IconComponent,
  trailing,
  className,
  children,
}: {
  active?: boolean;
  onSelect: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-muted-foreground outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40",
        active && "bg-surface-2 font-medium text-foreground dark:bg-surface-3",
        className,
      )}
    >
      {IconComponent && <IconComponent className="size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
    </button>
  );
};

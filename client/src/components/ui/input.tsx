import * as React from "react";
import { cn } from "@/lib/utils";

export const inputBase =
  "w-full min-w-0 rounded-md border border-input bg-surface px-3.5 text-sm text-foreground transition-[border-color,box-shadow,background-color] outline-none selection:bg-accent-green/25 placeholder:text-muted-foreground/80 focus-visible:border-accent-green/60 focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-surface-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-surface-2 dark:read-only:bg-surface";

export const Input = ({ className, type, ...props }: React.ComponentProps<"input">) => {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputBase,
        "h-10 py-2 file:mr-3 file:inline-flex file:h-7 file:cursor-pointer file:items-center file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-xs file:font-medium file:text-foreground",
        type === "file" && "h-auto py-1.5 pl-1.5",
        className,
      )}
      {...props}
    />
  );
};

export const InputGroup = ({
  icon: IconComponent,
  trailing,
  className,
  ...props
}: React.ComponentProps<"input"> & { icon?: React.ComponentType<{ className?: string }>; trailing?: React.ReactNode }) => {
  return (
    <div data-slot="input-group" className={cn("relative flex min-w-0 items-center", className)}>
      {IconComponent && <IconComponent className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />}
      <Input className={cn(IconComponent && "pl-10", trailing && "pr-12")} {...props} />
      {trailing && <div className="absolute right-1.5 flex items-center">{trailing}</div>}
    </div>
  );
};

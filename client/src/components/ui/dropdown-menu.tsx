import * as React from "react";
import { CheckIcon } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) => {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
};

export const DropdownMenuTrigger = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) => {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
};

export const DropdownMenuGroup = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) => {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
};

export const DropdownMenuContent = ({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[10rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
};

const itemClass =
  "relative flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

export const DropdownMenuItem = ({ className, variant = "default", ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { variant?: "default" | "destructive" }) => {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(itemClass, "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive-soft data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive", className)}
      {...props}
    />
  );
};

export const DropdownMenuCheckboxItem = ({ className, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) => {
  return (
    <DropdownMenuPrimitive.CheckboxItem data-slot="dropdown-menu-checkbox-item" className={cn(itemClass, "pr-8", className)} {...props}>
      {children}
      <span className="absolute right-2.5 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4 !text-accent-green" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    </DropdownMenuPrimitive.CheckboxItem>
  );
};

export const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) => {
  return <DropdownMenuPrimitive.Label data-slot="dropdown-menu-label" className={cn("px-2.5 py-1.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase", className)} {...props} />;
};

export const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) => {
  return <DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...props} />;
};

export const DropdownMenuShortcut = ({ className, ...props }: React.ComponentProps<"span">) => {
  return <span data-slot="dropdown-menu-shortcut" className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
};

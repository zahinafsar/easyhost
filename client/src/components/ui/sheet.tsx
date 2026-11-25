import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Sheet = (props: React.ComponentProps<typeof SheetPrimitive.Root>) => {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
};

export const SheetTrigger = (props: React.ComponentProps<typeof SheetPrimitive.Trigger>) => {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
};

export const SheetClose = (props: React.ComponentProps<typeof SheetPrimitive.Close>) => {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
};

const SIDES = {
  left: "inset-y-2 left-2 h-[calc(100%-1rem)] w-[min(320px,calc(100%-2rem))] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
  right: "inset-y-2 right-2 h-[calc(100%-1rem)] w-[min(420px,calc(100%-2rem))] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
  bottom: "inset-x-2 bottom-2 max-h-[85dvh] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  top: "inset-x-2 top-2 max-h-[85dvh] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
};

export const SheetContent = ({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "left" | "right" | "top" | "bottom"; showCloseButton?: boolean }) => {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-background p-4 outline-none data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300",
          SIDES[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="absolute top-3 right-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
};

export const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 pr-10", className)} {...props} />;
};

export const SheetFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2", className)} {...props} />;
};

export const SheetTitle = ({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) => {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-[17px] font-medium tracking-[-0.02em]", className)} {...props} />;
};

export const SheetDescription = ({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) => {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
};

export const Drawer = Sheet;
export const DrawerTrigger = SheetTrigger;
export const DrawerContent = SheetContent;
export const DrawerClose = SheetClose;

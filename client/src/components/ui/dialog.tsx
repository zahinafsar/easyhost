import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Dialog = (props: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
};

export const DialogTrigger = (props: React.ComponentProps<typeof DialogPrimitive.Trigger>) => {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
};

export const DialogPortal = (props: React.ComponentProps<typeof DialogPrimitive.Portal>) => {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
};

export const DialogClose = (props: React.ComponentProps<typeof DialogPrimitive.Close>) => {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
};

export const DialogOverlay = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) => {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", className)}
      {...props}
    />
  );
};

const SIZES = {
  sm: "sm:max-w-sm",
  default: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export const DialogContent = ({
  className,
  children,
  showCloseButton = true,
  size = "default",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean; size?: keyof typeof SIZES }) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-5 overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          SIZES[size],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
};

export const DialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 pr-8 text-left", className)} {...props} />;
};

export const DialogBody = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="dialog-body" className={cn("flex min-w-0 flex-col gap-4", className)} {...props} />;
};

export const DialogFooter = ({ className, showCloseButton = false, children, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) => {
  return (
    <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="secondary">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
};

export const DialogTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg leading-tight font-medium tracking-[-0.02em]", className)} {...props} />;
};

export const DialogDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
};

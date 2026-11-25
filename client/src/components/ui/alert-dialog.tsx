import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const AlertDialog = (props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) => {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
};

export const AlertDialogTrigger = (props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) => {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
};

export const AlertDialogPortal = (props: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) => {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
};

export const AlertDialogOverlay = ({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) => {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", className)}
      {...props}
    />
  );
};

export const AlertDialogContent = ({ className, size = "default", ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content> & { size?: "default" | "sm" }) => {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-5 rounded-2xl border border-border bg-card p-6 text-card-foreground duration-200 data-[size=sm]:max-w-xs data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[size=default]:sm:max-w-md",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
};

export const AlertDialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />;
};

export const AlertDialogFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
};

export const AlertDialogTitle = ({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) => {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("text-lg leading-tight font-medium tracking-[-0.02em]", className)} {...props} />;
};

export const AlertDialogDescription = ({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) => {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
};

export const AlertDialogMedia = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn("mb-1 inline-flex size-12 items-center justify-center rounded-full border border-border bg-surface-2 *:[svg:not([class*='size-'])]:size-5", className)}
      {...props}
    />
  );
};

export const AlertDialogAction = ({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & Pick<React.ComponentProps<typeof Button>, "variant" | "size">) => {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action data-slot="alert-dialog-action" className={cn(className)} {...props} />
    </Button>
  );
};

export const AlertDialogCancel = ({
  className,
  variant = "secondary",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> & Pick<React.ComponentProps<typeof Button>, "variant" | "size">) => {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" className={cn(className)} {...props} />
    </Button>
  );
};

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/providers/theme-provider";

export const Toaster = (props: ToasterProps) => {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      gap={10}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !font-sans !gap-3 !px-4 !py-3.5",
          title: "!text-sm !font-medium",
          description: "!text-[13px] !text-muted-foreground",
          actionButton: "!rounded-md !bg-primary !text-primary-foreground !font-medium",
          cancelButton: "!rounded-md !bg-secondary !text-secondary-foreground",
          closeButton: "!border-border !bg-surface !text-muted-foreground",
          success: "[&_[data-icon]]:!text-accent-green",
          error: "[&_[data-icon]]:!text-destructive",
          warning: "[&_[data-icon]]:!text-warning",
          info: "[&_[data-icon]]:!text-info",
        },
      }}
      {...props}
    />
  );
};

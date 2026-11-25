import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconVariants = cva("shrink-0", {
  variants: {
    size: {
      xs: "size-3",
      sm: "size-3.5",
      default: "size-4",
      lg: "size-5",
      xl: "size-6",
    },
    tone: {
      current: "",
      default: "text-foreground",
      muted: "text-muted-foreground",
      success: "text-accent-green",
      warning: "text-warning",
      danger: "text-destructive",
      info: "text-info",
    },
  },
  defaultVariants: {
    size: "default",
    tone: "current",
  },
});

export const Icon = ({ icon: IconComponent, size, tone, className, label }: VariantProps<typeof iconVariants> & { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean; "aria-label"?: string }>; className?: string; label?: string }) => {
  if (label) {
    return <IconComponent aria-label={label} className={cn(iconVariants({ size, tone }), className)} />;
  }
  return <IconComponent aria-hidden className={cn(iconVariants({ size, tone }), className)} />;
};

const badgeToneClass = {
  default: "border-border bg-surface-2 text-foreground",
  success: "border-transparent bg-success-soft text-success-foreground",
  warning: "border-transparent bg-warning-soft text-warning-foreground",
  danger: "border-transparent bg-destructive-soft text-destructive-foreground",
  info: "border-transparent bg-info-soft text-info-foreground",
  inverse: "border-transparent bg-primary text-primary-foreground",
};

export const IconBadge = ({ icon: IconComponent, tone = "default", size = "default", className }: { icon: React.ComponentType<{ className?: string }>; tone?: keyof typeof badgeToneClass; size?: "sm" | "default" | "lg"; className?: string }) => {
  const sizeClass = { sm: "size-7 [&_svg]:size-3.5", default: "size-9 [&_svg]:size-4", lg: "size-11 [&_svg]:size-5" }[size];
  return (
    <span data-slot="icon-badge" className={cn("inline-flex shrink-0 items-center justify-center rounded-full border", badgeToneClass[tone], sizeClass, className)}>
      <IconComponent />
    </span>
  );
};

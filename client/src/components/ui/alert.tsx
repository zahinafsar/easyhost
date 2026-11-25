import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex w-full min-w-0 items-start gap-3 rounded-lg border px-4 py-3.5 text-sm", {
  variants: {
    variant: {
      neutral: "border-border bg-surface-2 text-foreground",
      info: "border-info/20 bg-info-soft text-info-foreground",
      success: "border-success/20 bg-success-soft text-success-foreground",
      warning: "border-warning/25 bg-warning-soft text-warning-foreground",
      danger: "border-destructive/25 bg-destructive-soft text-destructive-foreground",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

const ICONS = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: OctagonAlert,
};

export type AlertProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> &
  VariantProps<typeof alertVariants> & {
    title?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }> | false;
    action?: React.ReactNode;
  };

export const Alert = ({ className, variant, title, icon, action, children, ...props }: AlertProps) => {
  let IconComponent: React.ComponentType<{ className?: string }> | null = ICONS[variant ?? "neutral"];
  if (icon === false) {
    IconComponent = null;
  } else if (icon) {
    IconComponent = icon;
  }
  let role = "status";
  if (variant === "danger") {
    role = "alert";
  }
  return (
    <div data-slot="alert" role={role} className={cn(alertVariants({ variant }), className)} {...props}>
      {IconComponent && <IconComponent className="mt-0.5 size-4 shrink-0" />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <div className="font-medium">{title}</div>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2 self-center">{action}</div>}
    </div>
  );
};

export const Banner = ({ className, ...props }: AlertProps) => {
  return <Alert className={cn("flex-wrap rounded-none border-x-0 border-t-0 px-4 py-2.5 md:px-6", className)} {...props} />;
};

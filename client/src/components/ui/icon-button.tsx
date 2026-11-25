import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export type IconButtonProps = Omit<ButtonProps, "size" | "children"> & {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  size?: "xs" | "sm" | "default" | "lg";
  tooltip?: boolean;
};

const SIZES = {
  xs: "icon-xs",
  sm: "icon-sm",
  default: "icon",
  lg: "icon-lg",
} as const;

export const IconButton = ({ label, icon: IconComponent, size = "sm", variant = "ghost", tooltip = true, ...props }: IconButtonProps) => {
  const button = (
    <Button aria-label={label} variant={variant} size={SIZES[size]} {...props}>
      <IconComponent />
    </Button>
  );
  if (!tooltip) {
    return button;
  }
  return <Tooltip content={label}>{button}</Tooltip>;
};

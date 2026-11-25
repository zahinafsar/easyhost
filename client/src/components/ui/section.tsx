import * as React from "react";
import { cn } from "@/lib/utils";
import { Box, type BoxProps } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export type SectionProps = Omit<BoxProps, "title"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  spacing?: "sm" | "default" | "lg";
};

const SPACING = {
  sm: "gap-3",
  default: "gap-4",
  lg: "gap-6",
};

export const Section = ({ title, description, action, spacing = "default", className, children, ...props }: SectionProps) => {
  const hasHeader = !!(title || description || action);
  return (
    <Box as="section" className={cn("flex min-w-0 flex-col", SPACING[spacing], className)} {...props}>
      {hasHeader && (
        <Box className="flex flex-wrap items-end justify-between gap-3">
          <Box className="flex min-w-0 flex-col gap-1.5">
            {title && <Heading level={3}>{title}</Heading>}
            {description && (
              <Text size="sm" tone="muted">
                {description}
              </Text>
            )}
          </Box>
          {action && <Box className="flex shrink-0 flex-wrap items-center gap-2">{action}</Box>}
        </Box>
      )}
      {children}
    </Box>
  );
};

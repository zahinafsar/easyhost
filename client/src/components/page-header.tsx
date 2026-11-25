import { cn } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";

export const PageHeader = ({
  title,
  description,
  action,
  back,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  back?: React.ReactNode;
  className?: string;
}) => {
  return (
    <Stack as="header" gap={3} className={cn("mb-6 border-b border-border pb-5", className)}>
      {back}
      <Stack direction="row" align="center" justify="between" wrap gap={4}>
        <Stack gap={1} className="min-w-0">
          <Heading level={1} size="lg">
            {title}
          </Heading>
          {description && (
            <Text size="base" tone="muted" wrap="pretty">
              {description}
            </Text>
          )}
        </Stack>
        {action && (
          <Stack direction="row" align="center" wrap gap={2} className="shrink-0 [&_[data-slot=button]]:min-w-32">
            {action}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};

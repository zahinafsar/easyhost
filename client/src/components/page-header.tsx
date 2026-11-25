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
    <Stack as="header" gap={4} className={cn("mb-8", className)}>
      {back}
      <Stack direction="row" align="end" justify="between" wrap gap={4}>
        <Stack gap={2} className="max-w-2xl">
          <Heading level={1}>{title}</Heading>
          {description && (
            <Text size="base" tone="muted" wrap="pretty">
              {description}
            </Text>
          )}
        </Stack>
        {action && (
          <Stack direction="row" align="center" wrap gap={2} className="shrink-0">
            {action}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};

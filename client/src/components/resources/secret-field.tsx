import { Copy } from "lucide-react";
import { Box } from "@/components/ui/box";
import { IconButton } from "@/components/ui/icon-button";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";

export const SecretField = ({ label, display, onCopy }: { label: string; display: string; onCopy: () => void }) => {
  return (
    <Stack gap={2} className="min-w-0">
      <Text size="2xs" tone="muted" weight="medium" className="tracking-[0.08em] uppercase">
        {label}
      </Text>
      <Stack direction="row" align="center" gap={2} className="rounded-md border border-border bg-surface-2 py-1 pr-1 pl-3.5">
        <Box className="scrollbar-thin min-w-0 flex-1 overflow-x-auto py-1.5">
          <Text as="span" size="xs" mono wrap="nowrap">
            {display}
          </Text>
        </Box>
        <IconButton icon={Copy} label={`Copy ${label.toLowerCase()}`} size="sm" onClick={onCopy} />
      </Stack>
    </Stack>
  );
};

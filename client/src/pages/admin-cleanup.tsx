import { useQuery } from "@tanstack/react-query";
import { BrushCleaning, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Frame } from "@/components/ui/frame";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { ConfirmButton } from "@/components/confirm-button";
import { api, unwrap } from "@/lib/api";
import { adminQuery } from "@/lib/queries";
import { formatBytes } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { AdminHeader, TableCard } from "@/components/admin-layout";

export const AdminCleanupPage = () => {
  const { data, isFetching, refetch } = useQuery(adminQuery().cleanup());
  const clean = useApiMutation({
    mutationFn: () => unwrap(api.admin.cleanup.$post()),
    invalidate: [adminQuery().all],
    onSuccess: ({ freedBytes }) => {
      toast.success(`Cleanup finished, about ${formatBytes(freedBytes)} freed`);
    },
  });

  let cleanLabel = "Clean up";
  if (clean.isPending) {
    cleanLabel = "Cleaning...";
  }

  return (
    <Stack gap={6}>
      <AdminHeader
        title="Cleanup"
        description="Reclaimable disk space. Sizes are estimates because image layers can be shared."
        action={
          <>
            <Button variant="secondary" onClick={() => refetch()} disabled={isFetching || clean.isPending}>
              <RefreshCw />
              Rescan
            </Button>
            <ConfirmButton
              title="Clean up unused data?"
              description="This removes everything listed below that is older than one hour. Running apps, their current images and the latest deploy of every app are kept. This cannot be undone."
              confirmLabel="Clean up"
              confirmVariant="destructive"
              onConfirm={() => clean.mutate()}
            >
              <Button disabled={clean.isPending || isFetching}>
                <BrushCleaning />
                {cleanLabel}
              </Button>
            </ConfirmButton>
          </>
        }
      />
      {!data && <Skeleton className="h-64 w-full rounded-xl" />}
      {data && (
        <>
          <Frame variant="inverse" padding="lg">
            <Stack gap={3}>
              <Text as="span" size="sm" tone="inverse">Reclaimable</Text>
              <Heading level={2} display tone="inverse" className="tabular-nums">
                {formatBytes(data.totalBytes)}
              </Heading>
            </Stack>
          </Frame>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.groups.map((group) => (
                  <TableRow key={group.key}>
                    <TableCell className="whitespace-normal">
                      <Text weight="medium">{group.label}</Text>
                      <Text size="xs" tone="muted">
                        {group.description}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{group.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBytes(group.bytes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        </>
      )}
    </Stack>
  );
};

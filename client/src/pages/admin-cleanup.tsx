import { useQuery } from "@tanstack/react-query";
import { BrushCleaning } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { api, unwrap } from "@/lib/api";
import { adminQuery } from "@/lib/queries";
import { formatBytes } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { AdminHeader } from "@/components/admin-layout";

export const AdminCleanupPage = () => {
  const { data, isFetching, refetch } = useQuery(adminQuery().cleanup());
  const clean = useApiMutation({
    mutationFn: () => unwrap(api.admin.cleanup.$post()),
    invalidate: [adminQuery().all],
    onSuccess: ({ freedBytes }) => {
      toast.success(`Cleanup finished, about ${formatBytes(freedBytes)} freed`);
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Cleanup"
        description="Reclaimable disk space. Sizes are estimates because image layers can be shared."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching || clean.isPending}>
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
                <BrushCleaning className="size-4" />
                {clean.isPending ? "Cleaning..." : "Clean up"}
              </Button>
            </ConfirmButton>
          </div>
        }
      />
      {!data && <Skeleton className="h-64 w-full" />}
      {data && (
        <>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatBytes(data.totalBytes)}</p>
          <Card>
            <CardContent>
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
                      <TableCell>
                        <p className="font-medium">{group.label}</p>
                        <p className="text-xs whitespace-normal text-muted-foreground">{group.description}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{group.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBytes(group.bytes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { api, unwrap } from "@/lib/api";
import { storageQuery, userQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const StoragePage = () => {
  const { data, isLoading } = useQuery(storageQuery().buckets());

  const createBucket = useApiMutation({
    mutationFn: (name: string) => unwrap(api.storage.buckets.$post({ json: { name } })),
    invalidate: [storageQuery().all, userQuery().all],
    success: "Bucket created",
  });

  return (
    <>
      <PageHeader
        title="Storage"
        description="S3 compatible object storage for your files."
        action={
          <CreateResourceDialog
            title="Create bucket"
            description="Buckets hold your files. Every file gets a public link."
            triggerLabel="New bucket"
            placeholder="uploads"
            isPending={createBucket.isPending}
            onSubmit={(name) => createBucket.mutateAsync(name)}
            usage={data && { count: data.buckets.length, limit: data.limit }}
          />
        }
      />
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && !data.buckets.length && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <HardDrive className="size-8 text-muted-foreground" />
            <p className="font-medium">No buckets yet</p>
            <p className="text-sm text-muted-foreground">Create a bucket to start uploading files.</p>
          </CardContent>
        </Card>
      )}
      {data && !!data.buckets.length && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Public URL</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.buckets.map((bucket) => (
                <TableRow key={bucket.id}>
                  <TableCell>
                    <Link to={`/storage/${bucket.id}`} className="font-medium hover:underline">
                      {bucket.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">{bucket.baseUrl}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(bucket.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
};

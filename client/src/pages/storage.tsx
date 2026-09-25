import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { api, unwrap } from "@/lib/api";
import { storageQuery, userQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const StoragePage = () => {
  const { data, isLoading } = useQuery(storageQuery().buckets());
  const [isPublic, setIsPublic] = useState(false);

  const createBucket = useApiMutation({
    mutationFn: (name: string) => unwrap(api.storage.buckets.$post({ json: { name, isPublic } })),
    invalidate: [storageQuery().all, userQuery().all],
    success: "Bucket created",
    onSuccess: () => setIsPublic(false),
  });

  return (
    <>
      <PageHeader
        title="Storage"
        description="S3 compatible object storage for your files."
        action={
          <CreateResourceDialog
            title="Create bucket"
            description="Buckets hold your files. Public buckets serve files without a signed link."
            triggerLabel="New bucket"
            placeholder="uploads"
            isPending={createBucket.isPending}
            onSubmit={(name) => createBucket.mutateAsync(name)}
          >
            <div className="flex items-center gap-2">
              <Switch id="bucket-public" checked={isPublic} onCheckedChange={setIsPublic} />
              <Label htmlFor="bucket-public">Public read access</Label>
            </div>
          </CreateResourceDialog>
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
                <TableHead>Access</TableHead>
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
                  <TableCell>
                    <Badge variant="secondary">{bucket.isPublic ? "Public" : "Private"}</Badge>
                  </TableCell>
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

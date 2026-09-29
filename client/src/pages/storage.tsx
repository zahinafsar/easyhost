import { Navigate, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { api, unwrap } from "@/lib/api";
import { storageQuery, userQuery } from "@/lib/queries";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const StoragePage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(storageQuery().buckets());

  const createStorage = useApiMutation({
    mutationFn: (name: string) => unwrap(api.storage.buckets.$post({ json: { name } })),
    invalidate: [storageQuery().all, userQuery().all],
    success: "Storage created",
    onSuccess: ({ bucket }) => navigate(`/storage/${bucket.id}`),
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (data?.buckets[0]) {
    return <Navigate to={`/storage/${data.buckets[0].id}`} replace />;
  }

  return (
    <>
      <PageHeader title="Storage" description="S3 compatible object storage isolated to this project." />
      <Card>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center border bg-muted/40">
            <HardDrive className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Create a new storage</p>
            <p className="max-w-md text-sm text-muted-foreground">Store uploads and static files with project-specific S3 credentials.</p>
          </div>
          <CreateResourceDialog
            title="Create storage"
            description="Your project gets one bucket with its own S3 access keys and public file URLs."
            triggerLabel="Create storage"
            placeholder="uploads"
            isPending={createStorage.isPending}
            onSubmit={(name) => createStorage.mutateAsync(name)}
          />
        </CardContent>
      </Card>
    </>
  );
};

import { Navigate, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import { Card, EmptyState, Skeleton } from "@/components/ui";
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
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (data?.buckets[0]) {
    return <Navigate to={`/storage/${data.buckets[0].id}`} replace />;
  }

  return (
    <>
      <PageHeader title="Storage" description="S3 compatible object storage isolated to this project." />
      <Card className="py-0">
        <EmptyState
          className="min-h-72"
          icon={HardDrive}
          title="Create a new storage"
          description="Store uploads and static files with project-specific S3 credentials."
          action={
            <CreateResourceDialog
              title="Create storage"
              description="Your project gets one bucket with its own S3 access keys and public file URLs."
              triggerLabel="Create storage"
              placeholder="uploads"
              isPending={createStorage.isPending}
              onSubmit={(name) => createStorage.mutateAsync(name)}
            />
          }
        />
      </Card>
    </>
  );
};

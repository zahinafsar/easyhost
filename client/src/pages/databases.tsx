import { Navigate, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { api, unwrap } from "@/lib/api";
import { databasesQuery, userQuery } from "@/lib/queries";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const DatabasesPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(databasesQuery().list());

  const createDatabase = useApiMutation({
    mutationFn: (name: string) => unwrap(api.databases.$post({ json: { name } })),
    invalidate: [databasesQuery().all, userQuery().all],
    success: "Database created",
    onSuccess: ({ database }) => navigate(`/databases/${database.id}`),
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (data?.databases[0]) {
    return <Navigate to={`/databases/${data.databases[0].id}`} replace />;
  }

  return (
    <>
      <PageHeader title="Database" description="A private Postgres database isolated to this project." />
      <Card className="py-0">
        <EmptyState
          className="min-h-72"
          icon={Database}
          title="Create a new database"
          description="Provision Postgres with a dedicated user and ready-to-copy connection strings."
          action={
            <CreateResourceDialog
              title="Create database"
              description="A new empty Postgres database with its own user, password, and shadow database."
              triggerLabel="Create database"
              placeholder="main"
              isPending={createDatabase.isPending}
              onSubmit={(name) => createDatabase.mutateAsync(name)}
            />
          }
        />
      </Card>
    </>
  );
};

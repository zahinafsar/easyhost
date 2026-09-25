import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { api, unwrap } from "@/lib/api";
import { databasesQuery, userQuery } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const DatabasesPage = () => {
  const { data, isLoading } = useQuery(databasesQuery().list());

  const createDatabase = useApiMutation({
    mutationFn: (name: string) => unwrap(api.databases.$post({ json: { name } })),
    invalidate: [databasesQuery().all, userQuery().all],
    success: "Database created",
  });

  return (
    <>
      <PageHeader
        title="Databases"
        description="Serverless SQLite databases over HTTP."
        action={
          <CreateResourceDialog
            title="Create database"
            description="A new empty SQLite database."
            triggerLabel="New database"
            placeholder="main"
            isPending={createDatabase.isPending}
            onSubmit={(name) => createDatabase.mutateAsync(name)}
          />
        }
      />
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && !data.databases.length && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Database className="size-8 text-muted-foreground" />
            <p className="font-medium">No databases yet</p>
            <p className="text-sm text-muted-foreground">Create a database and query it from anywhere with an API key.</p>
          </CardContent>
        </Card>
      )}
      {data && !!data.databases.length && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.databases.map((database) => (
                <TableRow key={database.id}>
                  <TableCell>
                    <Link to={`/databases/${database.id}`} className="font-medium hover:underline">
                      {database.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatBytes(database.sizeBytes)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(database.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
};

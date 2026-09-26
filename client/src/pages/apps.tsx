import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CodeBlock } from "@/components/code-block";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { api, unwrap } from "@/lib/api";
import { appsQuery, userQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const AppsPage = () => {
  const { data, isLoading } = useQuery(appsQuery().list());

  const createApp = useApiMutation({
    mutationFn: (name: string) => unwrap(api.apps.$post({ json: { name } })),
    invalidate: [appsQuery().all, userQuery().all],
    success: "App created",
  });

  return (
    <>
      <PageHeader
        title="Apps"
        description="Next.js apps deployed with the EasyHost CLI."
        action={
          <CreateResourceDialog
            title="Create app"
            description="The name becomes your subdomain."
            triggerLabel="New app"
            placeholder="my-app"
            isPending={createApp.isPending}
            onSubmit={(name) => createApp.mutateAsync(name)}
            usage={data && { count: data.apps.length, limit: data.limit }}
          />
        }
      />
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && !data.apps.length && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Rocket className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No apps yet</p>
              <p className="text-sm text-muted-foreground">Create one here or run the CLI inside a Next.js project.</p>
            </div>
            <CodeBlock className="w-full max-w-sm text-left" code={"npx ezhst login\nnpx ezhst deploy"} />
          </CardContent>
        </Card>
      )}
      {data && !!data.apps.length && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Last deploy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <Link to={`/apps/${app.id}`} className="font-medium hover:underline">
                      {app.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell>
                    <a href={app.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">
                      {app.url}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(app.deployments[0]?.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
};

import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, unwrap } from "@/lib/api";
import { appsQuery, projectsQuery } from "@/lib/queries";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { formatDate } from "@/lib/format";

export const AppsPage = () => {
  const { data, isLoading, error } = useQuery(appsQuery().list());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useApiMutation({
    mutationFn: () => unwrap(api.apps.$post({ json: { name: name.trim() } })),
    invalidate: [appsQuery().all, projectsQuery().all],
    success: "App created",
    onSuccess: () => { setOpen(false); setName(""); },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (error) {
    return <p role="alert" className="text-destructive">{error.message}</p>;
  }
  if (!data) {
    return null;
  }

  return (
    <>
      <PageHeader title="Apps" description="Deploy Node.js services with their own builds, environment, and domains." action={
        <Button disabled={data.apps.length >= data.limit} onClick={() => setOpen(true)}><Plus className="size-4" />Create app</Button>
      } />
      <div className="mb-6 flex items-center justify-between border-b pb-3 text-sm">
        <span className="text-muted-foreground">Apps in this project</span>
        <span className="font-mono tabular-nums">{data.apps.length} / {data.limit}</span>
      </div>
      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.apps.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No apps yet. Create an app to deploy your first Node.js service.
                </TableCell>
              </TableRow>
            )}
            {data.apps.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">
                  <Link to={`/apps/${app.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {app.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{app.url}</TableCell>
                <TableCell><StatusBadge status={app.status} /></TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{formatDate(app.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); create.mutate(undefined); }}>
            <DialogHeader><DialogTitle>New app</DialogTitle><DialogDescription>Create a Node.js app in this project. You can deploy its source with the CLI.</DialogDescription></DialogHeader>
            <div className="space-y-2"><Label htmlFor="app-name">App name</Label><Input id="app-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="My API" minLength={2} maxLength={40} required autoFocus /></div>
            <DialogFooter><Button type="submit" disabled={create.isPending || name.trim().length < 2}>{create.isPending ? "Creating..." : "Create app"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

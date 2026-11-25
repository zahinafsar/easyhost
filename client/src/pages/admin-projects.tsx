import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { api, unwrap } from "@/lib/api";
import { adminQuery, type AdminProjectFilters } from "@/lib/queries/admin";
import { formatBytes, formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { AdminHeader, EmptyRow, IMPERSONATE_NOTICE, Paginator, formatNumber } from "@/components/admin-layout";
import { useImpersonate } from "@/pages/admin-users";

export const useDeleteProject = (onDone?: () => void) => {
  return useApiMutation({
    mutationFn: (id: string) => unwrap(api.admin.projects[":id"].$delete({ param: { id } })),
    invalidate: [adminQuery().all],
    onSuccess: ({ emailSent }) => {
      if (emailSent) {
        toast.success("Project deleted and owner notified");
      } else {
        toast.warning("Project deleted, but the email to the owner failed");
      }
      onDone?.();
    },
  });
};

export const ProjectActions = ({
  project,
  onDeleted,
}: {
  project: { id: string; name: string; slug: string; owner: { id: string; email: string } };
  onDeleted?: () => void;
}) => {
  const { user } = useAuth();
  const impersonate = useImpersonate();
  const remove = useDeleteProject(onDeleted);
  return (
    <div className="flex justify-end gap-2">
      <ConfirmButton title={`Impersonate ${project.owner.email}?`} description={IMPERSONATE_NOTICE} confirmLabel="Impersonate" onConfirm={() => impersonate.mutate(project.owner.id)}>
        <Button size="icon-sm" variant="outline" aria-label="Impersonate owner" disabled={user?.id === project.owner.id || impersonate.isPending}>
          <UserRound className="size-4" />
        </Button>
      </ConfirmButton>
      <ConfirmButton
        title={`Delete ${project.name}?`}
        description={`This permanently removes all apps, deployments, domains, storage bucket and database of ${project.slug}, and emails ${project.owner.email} that it was deleted.`}
        confirmLabel="Delete project"
        confirmVariant="destructive"
        onConfirm={() => remove.mutate(project.id)}
      >
        <Button size="icon-sm" variant="outline" aria-label="Delete project" disabled={remove.isPending}>
          <Trash2 className="size-4" />
        </Button>
      </ConfirmButton>
    </div>
  );
};

const useProjectFilters = () => {
  const [params, setParams] = useSearchParams();
  const filters: AdminProjectFilters = {
    page: Math.max(1, Number(params.get("page")) || 1),
    search: params.get("search") ?? "",
    state: (params.get("state") as AdminProjectFilters["state"]) ?? "all",
    sort: (params.get("sort") as AdminProjectFilters["sort"]) ?? "newest",
  };
  const update = (changes: Partial<AdminProjectFilters>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ page: 1, ...changes })) {
      next.set(key, String(value));
    }
    setParams(next, { replace: true });
  };
  return { filters, update };
};

export const AdminProjectsPage = () => {
  const { filters, update } = useProjectFilters();
  const [draft, setDraft] = useState(filters.search);
  const { data } = useQuery(adminQuery().projects(filters));

  return (
    <div className="space-y-6">
      <AdminHeader title="Projects" description="Every project with its apps, data and live usage." />
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-64 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update({ search: draft.trim() });
          }}
        >
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search by name, slug or owner email" />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Select value={filters.state} onValueChange={(value) => update({ state: value as AdminProjectFilters["state"] })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="stopped">Not running</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(value) => update({ sort: value as AdminProjectFilters["sort"] })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!data && <Skeleton className="h-96 w-full" />}
      {data && (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Apps</TableHead>
                  <TableHead className="text-right">Memory</TableHead>
                  <TableHead className="text-right">CPU</TableHead>
                  <TableHead className="text-right">Database</TableHead>
                  <TableHead className="text-right">Deploys</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projects.length === 0 && <EmptyRow colSpan={9}>No projects match these filters</EmptyRow>}
                {data.projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link to={`/admin/projects/${project.id}`} className="font-medium hover:underline">
                        {project.name}
                      </Link>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground">{project.slug}</span>
                        {project.suspended && <Badge variant="destructive">Suspended</Badge>}
                        {project.databaseBlocked && <Badge variant="destructive">DB blocked</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/users/${project.owner.id}`} className="text-sm hover:underline">
                        {project.owner.email}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project.runningApps} / {project.apps}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{project.memoryBytes === null ? "-" : formatBytes(project.memoryBytes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{project.cpuPercent === null ? "-" : `${project.cpuPercent}%`}</TableCell>
                    <TableCell className="text-right tabular-nums">{project.databaseBytes === null ? "-" : formatBytes(project.databaseBytes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(project.deployments)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
                    <TableCell>
                      <ProjectActions project={project} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Paginator page={data.page} pages={data.pages} total={data.total} label="projects" onPage={(page) => update({ page })} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

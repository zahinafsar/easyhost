import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { AdminHeader, ChartCard, EmptyRow, PageSkeleton, Stat, StatGrid, formatRelative, formatSeconds } from "@/components/admin-layout";
import { ProjectActions } from "@/pages/admin-projects";

const durationOf = (startedAt: string | null, finishedAt: string | null) => {
  if (!startedAt || !finishedAt) {
    return null;
  }
  return (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000;
};

const bytesOrDash = (bytes: number | null | undefined) => {
  if (bytes === null || bytes === undefined) {
    return "-";
  }
  return formatBytes(bytes);
};

export const AdminProjectPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isError } = useQuery(adminQuery().project(id));

  const back = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link to="/admin/projects">
        <ArrowLeft className="size-4" />
        Projects
      </Link>
    </Button>
  );

  if (isError) {
    return (
      <div>
        {back}
        <p className="text-sm text-muted-foreground">This project does not exist anymore.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div>
        {back}
        <PageSkeleton />
      </div>
    );
  }

  const { project, apps } = data;
  const running = apps.filter((app) => app.status === "RUNNING");
  const memory = running.reduce((sum, app) => sum + (app.usage?.memoryBytes ?? 0), 0);
  const cpu = running.reduce((sum, app) => sum + (app.usage?.cpuPercent ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        {back}
        <AdminHeader
          title={project.name}
          description={project.slug}
          action={<ProjectActions project={project} onDeleted={() => navigate("/admin/projects")} />}
        />
      </div>
      <StatGrid>
        <Stat label="Apps running" value={`${running.length} / ${apps.length}`} />
        <Stat label="Memory now" value={formatBytes(memory)} hint={`${Math.round(cpu * 10) / 10}% CPU`} />
        <Stat label="Database" value={bytesOrDash(project.database?.bytes)} hint={project.database?.blocked ? "Blocked, over plan size" : project.database?.name} />
        <Stat label="Storage" value={bytesOrDash(project.bucket?.bytes)} hint={project.bucket?.name} />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Owner and members</CardTitle>
            <CardDescription>Created {formatDate(project.createdAt)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Link to={`/admin/users/${project.owner.id}`} className="font-medium hover:underline">
                {project.owner.email}
              </Link>
              <Badge>Owner</Badge>
            </div>
            {project.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-2">
                <Link to={`/admin/users/${member.id}`} className="hover:underline">
                  {member.email}
                </Link>
                <span className="text-xs text-muted-foreground">Joined {formatDate(member.joinedAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <ChartCard
          title="Memory, last 7 days"
          time
          className="lg:col-span-2"
          data={data.history.map((row) => ({ ...row, t: String(row.t) }))}
          xKey="t"
          series={[{ key: "memoryBytes", label: "Memory" }]}
          format={formatBytes}
          height={180}
        />
      </div>
      {apps.map((app) => (
        <Card key={app.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {app.name}
                  <StatusBadge status={app.status} />
                  {app.kind === "AI" && <Badge variant="outline">AI</Badge>}
                  {app.suspended && <Badge variant="destructive">Suspended</Badge>}
                </CardTitle>
                <a href={app.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted-foreground hover:underline">
                  {app.url}
                </a>
              </div>
              <div className="text-right text-sm text-muted-foreground tabular-nums">
                {app.usage && (
                  <>
                    {formatBytes(app.usage.memoryBytes)}, {app.usage.cpuPercent}% CPU
                  </>
                )}
                {app.nodeVersion && <p className="text-xs">Node {app.nodeVersion}</p>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {app.domains.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {app.domains.map((domain) => (
                  <span key={domain.id} className="flex items-center gap-1 border px-2 py-1 text-xs" title={domain.error ?? undefined}>
                    <span className="font-mono">{domain.hostname}</span>
                    <StatusBadge status={domain.status} />
                  </span>
                ))}
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deployment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {app.deployments.length === 0 && <EmptyRow colSpan={5}>No deployments</EmptyRow>}
                {app.deployments.map((deployment) => (
                  <TableRow key={deployment.id}>
                    <TableCell className="font-mono text-xs">{deployment.id}</TableCell>
                    <TableCell>
                      <StatusBadge status={deployment.status} />
                    </TableCell>
                    <TableCell className="text-sm capitalize">{deployment.step.toLowerCase()}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSeconds(durationOf(deployment.startedAt, deployment.finishedAt))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatRelative(deployment.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

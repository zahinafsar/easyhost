import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Grid, GridItem } from "@/components/ui/grid";
import { Link } from "@/components/ui/link";
import { List, ListItem } from "@/components/ui/list";
import { Pill } from "@/components/ui/pill";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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

const BackLink = () => {
  return (
    <Link to="/admin/projects" variant="plain" inline={false} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 self-start")}>
      <ArrowLeft />
      Projects
    </Link>
  );
};

const DomainPill = ({ hostname, status, error }: { hostname: string; status: string; error: string | null }) => {
  const pill = (
    <Pill size="default" className="gap-2 pr-1.5">
      <Text as="span" size="xs" mono>
        {hostname}
      </Text>
      <StatusBadge status={status} />
    </Pill>
  );
  if (!error) {
    return pill;
  }
  return <Tooltip content={error}>{pill}</Tooltip>;
};

export const AdminProjectPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isError } = useQuery(adminQuery().project(id));

  if (isError) {
    return (
      <Stack gap={4}>
        <BackLink />
        <EmptyState icon={FolderKanban} title="Project not found" description="This project does not exist anymore." bordered />
      </Stack>
    );
  }
  if (!data) {
    return (
      <Stack gap={4}>
        <BackLink />
        <PageSkeleton />
      </Stack>
    );
  }

  const { project, apps } = data;
  const running = apps.filter((app) => app.status === "RUNNING");
  const memory = running.reduce((sum, app) => sum + (app.usage?.memoryBytes ?? 0), 0);
  const cpu = running.reduce((sum, app) => sum + (app.usage?.cpuPercent ?? 0), 0);
  let databaseHint = project.database?.name;
  if (project.database?.blocked) {
    databaseHint = "Blocked, over plan size";
  }

  return (
    <Stack gap={6}>
      <Stack gap={4}>
        <BackLink />
        <AdminHeader
          title={project.name}
          description={project.slug}
          action={<ProjectActions project={project} onDeleted={() => navigate("/admin/projects")} />}
        />
      </Stack>
      <StatGrid>
        <Stat label="Apps running" value={`${running.length} / ${apps.length}`} />
        <Stat label="Memory now" value={formatBytes(memory)} hint={`${Math.round(cpu * 10) / 10}% CPU`} />
        <Stat label="Database" value={bytesOrDash(project.database?.bytes)} hint={databaseHint} />
        <Stat label="Storage" value={bytesOrDash(project.bucket?.bytes)} hint={project.bucket?.name} />
      </StatGrid>
      <Grid cols={3} className="sm:grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Owner and members</CardTitle>
            <CardDescription>Created {formatDate(project.createdAt)}</CardDescription>
          </CardHeader>
          <CardContent>
            <List variant="divided">
              <ListItem>
                <Stack direction="row" align="center" justify="between" gap={2}>
                  <Link to={`/admin/users/${project.owner.id}`} className="min-w-0 truncate">
                    {project.owner.email}
                  </Link>
                  <Badge>Owner</Badge>
                </Stack>
              </ListItem>
              {project.members.map((member) => (
                <ListItem key={member.id}>
                  <Stack direction="row" align="center" justify="between" gap={2}>
                    <Link to={`/admin/users/${member.id}`} variant="muted" className="min-w-0 truncate">
                      {member.email}
                    </Link>
                    <Text as="span" size="xs" tone="muted">
                      Joined {formatDate(member.joinedAt)}
                    </Text>
                  </Stack>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
        <GridItem className="lg:col-span-2">
          <ChartCard
            title="Memory, last 7 days"
            time
            className="h-full"
            data={data.history.map((row) => ({ ...row, t: String(row.t) }))}
            xKey="t"
            series={[{ key: "memoryBytes", label: "Memory" }]}
            format={formatBytes}
            height={180}
          />
        </GridItem>
      </Grid>
      {apps.map((app) => (
        <Card key={app.id} className="gap-4">
          <CardHeader>
            <CardTitle>
              <Stack direction="row" align="center" wrap gap={2}>
                {app.name}
                <StatusBadge status={app.status} />
                {app.kind === "AI" && <Badge variant="outline">AI</Badge>}
                {app.suspended && <Badge variant="destructive">Suspended</Badge>}
              </Stack>
            </CardTitle>
            <CardDescription>
              <Link href={app.url} variant="muted" className="font-mono text-xs">
                {app.url}
              </Link>
            </CardDescription>
            <CardAction>
              <Stack gap={0} align="end">
                {app.usage && (
                  <Text size="sm" tone="muted" tabular>
                    {formatBytes(app.usage.memoryBytes)}, {app.usage.cpuPercent}% CPU
                  </Text>
                )}
                {app.kind !== "AI" && !app.hasDockerfile && (
                  <Text size="xs" tone="muted">
                    No Dockerfile
                  </Text>
                )}
              </Stack>
            </CardAction>
          </CardHeader>
          {app.domains.length > 0 && (
            <CardContent>
              <Stack direction="row" wrap gap={2}>
                {app.domains.map((domain) => (
                  <DomainPill key={domain.id} hostname={domain.hostname} status={domain.status} error={domain.error ?? null} />
                ))}
              </Stack>
            </CardContent>
          )}
          <CardContent className="px-0">
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
                    <TableCell>
                      <Text as="span" size="xs" mono>
                        {deployment.id}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={deployment.status} />
                    </TableCell>
                    <TableCell>
                      <Text as="span" size="sm" className="capitalize">
                        {deployment.step.toLowerCase()}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatSeconds(durationOf(deployment.startedAt, deployment.finishedAt))}</TableCell>
                    <TableCell>
                      <Text as="span" size="sm" tone="muted">
                        {formatRelative(deployment.createdAt)}
                      </Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

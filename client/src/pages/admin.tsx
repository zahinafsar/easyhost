import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleCheck, CircleX, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmButton } from "@/components/confirm-button";
import { StatusBadge } from "@/components/status-badge";
import { api, unwrap } from "@/lib/api";
import { adminQuery } from "@/lib/queries";
import { clearSelectedProject } from "@/lib/project";
import { formatBytes, formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90];

const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const useImpersonate = () => {
  return useApiMutation({
    mutationFn: (id: string) => unwrap(api.admin.users[":id"].impersonate.$post({ param: { id } })),
    onSuccess: () => {
      clearSelectedProject();
      window.location.href = "/";
    },
  });
};

const IMPERSONATE_NOTICE = "You will be signed in as this user for up to 2 hours. Anything you change is changed in their account. Use Stop impersonating to return.";

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => {
  return (
    <div className="border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};

const Meter = ({ label, used, total, format }: { label: string; used: number; total: number; format: (value: number) => string }) => {
  const percent = Math.min(100, Math.round((used / total) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {format(used)} of {format(total)} ({percent}%)
        </span>
      </div>
      <div className="mt-2 h-2 bg-muted">
        <div className={cn("h-full bg-primary", percent >= 90 && "bg-destructive")} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const Bars = ({ title, points }: { title: string; points: { day: string; value: number }[] }) => {
  const max = Math.max(1, ...points.map((point) => point.value));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{total}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-0.5 border-b">
          {points.map((point) => (
            <div key={point.day} className="group relative flex h-full flex-1 items-end">
              <div className="w-full bg-primary group-hover:opacity-70" style={{ height: `${(point.value / max) * 100}%`, minHeight: point.value > 0 ? 2 : 0 }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden -translate-x-1/2 border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-sm group-hover:block">
                <span className="font-medium tabular-nums">{point.value}</span>
                <span className="ml-2 text-muted-foreground">{point.day}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{points[0]?.day}</span>
          <span>{points[points.length - 1]?.day}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const HealthTab = () => {
  const { data, isLoading } = useQuery(adminQuery().health());
  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }
  const { host, builds } = data;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Services</CardTitle>
          <CardDescription>Checked every 15 seconds.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {data.checks.map((check) => (
            <div key={check.name} className="flex items-center gap-3 py-3">
              {check.ok ? <CircleCheck className="size-5 shrink-0 text-emerald-600" /> : <CircleX className="size-5 shrink-0 text-destructive" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{check.name}</p>
                <p className="truncate text-xs text-muted-foreground">{check.detail}</p>
              </div>
              <div className="text-right text-xs">
                <p className={cn("font-medium", check.ok ? "text-emerald-700" : "text-destructive")}>{check.ok ? "Healthy" : "Down"}</p>
                <p className="text-muted-foreground tabular-nums">{check.ms} ms</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Host</CardTitle>
          <CardDescription>
            Up {formatDuration(host.uptimeSeconds)}, API up {formatDuration(host.apiUptimeSeconds)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Meter label="Memory" used={host.memoryTotal - host.memoryFree} total={host.memoryTotal} format={formatBytes} />
          <Meter label="Disk" used={host.diskTotal - host.diskFree} total={host.diskTotal} format={formatBytes} />
          <Meter label={`Load (1 min, ${host.cpus} CPUs)`} used={host.load[0]} total={host.cpus} format={(value) => value.toFixed(2)} />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-4">
        <Stat label="Builds running" value={`${builds.building} / ${builds.concurrency}`} />
        <Stat label="Builds queued" value={builds.queued} hint={builds.oldestQueuedAt ? `Oldest since ${formatDate(builds.oldestQueuedAt)}` : undefined} />
        <Stat label="Failed builds, 24h" value={builds.failedLastDay} />
        <div className="border bg-card p-4">
          <p className="text-xs text-muted-foreground">Apps by status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.apps.map((row) => (
              <span key={row.status} className="flex items-center gap-1 text-sm tabular-nums">
                <StatusBadge status={row.status} />
                {row.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsTab = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery(adminQuery().analytics(days));
  const series = data?.series ?? [];
  const failedDeployments = series.reduce((sum, row) => sum + row.failedDeployments, 0);
  const failedEmails = series.reduce((sum, row) => sum + row.failedEmails, 0);
  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {RANGES.map((range) => (
          <Button key={range} size="sm" variant={range === days ? "default" : "outline"} onClick={() => setDays(range)}>
            {range} days
          </Button>
        ))}
      </div>
      {(isLoading || !data) && <Skeleton className="h-64 w-full" />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Users" value={data.totals.users} hint={`${data.totals.verifiedUsers} verified`} />
            <Stat label="Projects" value={data.totals.projects} hint={`${data.totals.runningApps} apps running`} />
            <Stat label="Databases" value={data.totals.databases} hint={`${data.totals.buckets} buckets`} />
            <Stat label="Custom domains" value={data.totals.domains} hint="Active" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Bars title={`Signups, last ${days} days`} points={series.map((row) => ({ day: row.day, value: row.signups }))} />
            <Bars title={`Projects created, last ${days} days`} points={series.map((row) => ({ day: row.day, value: row.projects }))} />
            <Bars title={`Deployments, last ${days} days (${failedDeployments} failed)`} points={series.map((row) => ({ day: row.day, value: row.deployments }))} />
            <Bars title={`Emails sent, last ${days} days (${failedEmails} failed)`} points={series.map((row) => ({ day: row.day, value: row.emails }))} />
          </div>
        </>
      )}
    </div>
  );
};

const UsageTab = ({ currentUserId }: { currentUserId: string }) => {
  const { data, isLoading } = useQuery(adminQuery().usage());
  const impersonate = useImpersonate();
  const removeProject = useApiMutation({
    mutationFn: (id: string) => unwrap(api.admin.projects[":id"].$delete({ param: { id } })),
    invalidate: [adminQuery().all],
    onSuccess: ({ emailSent }) => {
      if (emailSent) {
        toast.success("Project deleted and owner notified");
      } else {
        toast.warning("Project deleted, but the email to the owner failed");
      }
    },
  });
  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="App memory in use" value={formatBytes(data.totals.memoryBytes)} />
        <Stat label="Customer database size" value={formatBytes(data.totals.databaseBytes)} />
        <Stat label="Emails sent, 24h" value={data.totals.emailsToday} />
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Memory</TableHead>
                <TableHead className="text-right">CPU</TableHead>
                <TableHead className="text-right">Database</TableHead>
                <TableHead className="text-right">Emails, 24h</TableHead>
                <TableHead className="text-right">Deploys</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <p className="font-medium">{project.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{project.slug}</p>
                  </TableCell>
                  <TableCell className="text-sm">{project.owner.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={project.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {project.container ? `${formatBytes(project.container.memoryBytes)} / ${formatBytes(data.limits.memoryBytes)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{project.container ? `${project.container.cpuPercent}%` : "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{project.databaseBytes === null ? "-" : formatBytes(project.databaseBytes)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {project.emailsToday} / {data.limits.emailsPerDay}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{project.deployments}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <ConfirmButton
                        title={`Impersonate ${project.owner.email}?`}
                        description={IMPERSONATE_NOTICE}
                        confirmLabel="Impersonate"
                        onConfirm={() => impersonate.mutate(project.owner.id)}
                      >
                        <Button size="icon-sm" variant="outline" aria-label="Impersonate owner" disabled={currentUserId === project.owner.id || impersonate.isPending}>
                          <UserRound className="size-4" />
                        </Button>
                      </ConfirmButton>
                      <ConfirmButton
                        title={`Delete ${project.name}?`}
                        description={`This permanently removes the app, deployments, domains, storage bucket, database, email sender and API keys of ${project.slug}, and emails ${project.owner.email} that it was deleted.`}
                        confirmLabel="Delete project"
                        confirmVariant="destructive"
                        onConfirm={() => removeProject.mutate(project.id)}
                      >
                        <Button size="icon-sm" variant="outline" aria-label="Delete project" disabled={removeProject.isPending}>
                          <Trash2 className="size-4" />
                        </Button>
                      </ConfirmButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const UsersTab = ({ currentUserId }: { currentUserId: string }) => {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery(adminQuery().users(page, search));

  const impersonate = useImpersonate();

  return (
    <div className="space-y-4">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(draft.trim());
        }}
      >
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search by name or email" />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {(isLoading || !data) && <Skeleton className="h-64 w-full" />}
      {data && (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Running</TableHead>
                  <TableHead className="text-right">Emails, 24h</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.role === "ADMIN" && <Badge>Admin</Badge>}
                        {user.blocked && <Badge variant="destructive">Blocked</Badge>}
                        <Badge variant="outline">{user.verified ? "Verified" : "Unverified"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.projects} / {data.projectLimit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{user.runningApps}</TableCell>
                    <TableCell className="text-right tabular-nums">{user.emailsToday}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {user.id !== currentUserId && !user.blocked && (
                        <ConfirmButton
                          title={`Impersonate ${user.email}?`}
                          description={IMPERSONATE_NOTICE}
                          confirmLabel="Impersonate"
                          onConfirm={() => impersonate.mutate(user.id)}
                        >
                          <Button size="sm" variant="outline" disabled={impersonate.isPending}>
                            <UserRound className="size-4" />
                            Impersonate
                          </Button>
                        </ConfirmButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data.total} users, page {data.page} of {data.pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const AdminPage = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login?redirect=%2Fadmin" replace />;
  }
  if (user.role !== "ADMIN" || user.impersonatorId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between gap-4 border-b px-6">
        <div className="flex items-center gap-2 font-semibold">
          <img src="/logo.svg" alt="" className="h-6 w-auto" />
          EasyHost Admin
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </Button>
      </header>
      <main className="mx-auto w-full max-w-6xl p-6 md:p-8">
        <Tabs defaultValue="health" className="gap-6">
          <TabsList>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="health">
            <HealthTab />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
          <TabsContent value="usage">
            <UsageTab currentUserId={user.id} />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab currentUserId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

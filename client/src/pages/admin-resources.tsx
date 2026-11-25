import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery, type ResourceRange } from "@/lib/queries/admin";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminHeader, ChartCard, EmptyRow, Meter, Stat, StatGrid, formatDuration, formatNumber } from "@/components/admin-layout";

const RESOURCE_RANGES: ResourceRange[] = ["24h", "7d", "30d"];

const percent = (part: number, whole: number) => {
  if (whole <= 0) {
    return 0;
  }
  return Math.round((part / whole) * 1000) / 10;
};

const LiveHealth = () => {
  const { data } = useQuery(adminQuery().health());
  if (!data) {
    return <Skeleton className="h-64 w-full" />;
  }
  const { host, builds } = data;
  return (
    <div className="space-y-4">
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
      </div>
      <StatGrid>
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
      </StatGrid>
    </div>
  );
};

export const AdminResourcesPage = () => {
  const [range, setRange] = useState<ResourceRange>("24h");
  const { data } = useQuery(adminQuery().resources(range));
  const series = (data?.series ?? []).map((row) => ({
    ...row,
    t: String(row.t),
    memPercent: percent(row.memUsed, row.memTotal),
    diskPercent: percent(row.diskUsed, row.diskTotal),
  }));

  return (
    <div className="space-y-6">
      <AdminHeader title="Resources" description="Live health, and host and app usage sampled every 5 minutes (kept 30 days)." />
      <LiveHealth />
      <div className="flex items-center justify-between gap-4 pt-2">
        <h2 className="text-lg font-semibold tracking-tight">History</h2>
        <div className="flex border">
          {RESOURCE_RANGES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={cn("px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted", item === range && "bg-foreground text-background hover:bg-foreground")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {!data && <Skeleton className="h-72 w-full" />}
      {data && (
        <>
          {data.latest && (
            <StatGrid>
              <Stat label="CPU" value={`${data.latest.cpuPercent}%`} hint={`Load ${data.latest.load1.toFixed(2)}`} />
              <Stat label="Containers running" value={formatNumber(data.latest.containersRunning)} hint={`${data.latest.appsRunning} customer apps`} />
              <Stat label="Customer databases" value={formatBytes(data.latest.dbBytes)} />
              <Stat label="Customer storage" value={formatBytes(data.latest.storageBytes)} hint={`Sampled ${formatDate(data.latest.createdAt)}`} />
            </StatGrid>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="CPU" time data={series} xKey="t" series={[{ key: "cpuPercent", label: "CPU %" }]} format={(value) => `${Math.round(value)}%`} />
            <ChartCard
              title="Memory and disk"
              type="line"
              time
              data={series}
              xKey="t"
              series={[
                { key: "memPercent", label: "Memory %" },
                { key: "diskPercent", label: "Disk %" },
              ]}
              format={(value) => `${Math.round(value)}%`}
            />
            <ChartCard
              title="Running containers"
              type="line"
              time
              data={series}
              xKey="t"
              series={[
                { key: "containersRunning", label: "All containers" },
                { key: "appsRunning", label: "Customer apps" },
              ]}
            />
            <ChartCard
              title="Build queue"
              type="bar"
              time
              stacked
              data={series}
              xKey="t"
              series={[
                { key: "buildsRunning", label: "Running", color: "var(--chart-2)" },
                { key: "buildsQueued", label: "Queued", color: "var(--chart-4)" },
              ]}
            />
            <ChartCard
              title="Customer data"
              type="line"
              time
              className="lg:col-span-2"
              data={series}
              xKey="t"
              series={[
                { key: "dbBytes", label: "Databases" },
                { key: "storageBytes", label: "Storage" },
              ]}
              format={formatBytes}
            />
          </div>
          <Card>
            <CardHeader>
              <CardDescription>Heaviest apps in the last {range}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Avg memory</TableHead>
                    <TableHead className="text-right">Peak memory</TableHead>
                    <TableHead className="text-right">Avg CPU</TableHead>
                    <TableHead className="text-right">Peak CPU</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topApps.length === 0 && <EmptyRow colSpan={6}>No samples yet</EmptyRow>}
                  {data.topApps.map((row) => (
                    <TableRow key={row.appId}>
                      <TableCell>
                        <Link to={`/admin/projects/${row.projectId}`} className="font-mono text-sm hover:underline">
                          {row.slug}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.ownerEmail}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBytes(row.avgMemory)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBytes(row.maxMemory)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.avgCpu.toFixed(1)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{row.maxCpu.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

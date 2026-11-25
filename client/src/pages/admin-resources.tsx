import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { IconBadge } from "@/components/ui/icon";
import { Link } from "@/components/ui/link";
import { List, ListItem } from "@/components/ui/list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery, type ResourceRange } from "@/lib/queries/admin";
import { formatBytes, formatDate } from "@/lib/format";
import { AdminHeader, ChartCard, ChartGrid, EmptyRow, Meter, Stat, StatGrid, StatusBreakdown, TableCard, formatDuration, formatNumber } from "@/components/admin-layout";

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
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }
  const { host, builds } = data;
  let oldestQueued: string | undefined;
  if (builds.oldestQueuedAt) {
    oldestQueued = `Oldest since ${formatDate(builds.oldestQueuedAt)}`;
  }
  return (
    <Stack gap={4}>
      <ChartGrid>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Services</CardTitle>
            <CardDescription>Checked every 15 seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            <List variant="divided">
              {data.checks.map((check) => {
                let StatusIcon = CircleX;
                let tone: "success" | "danger" = "danger";
                let label = "Down";
                if (check.ok) {
                  StatusIcon = CircleCheck;
                  tone = "success";
                  label = "Healthy";
                }
                return (
                  <ListItem key={check.name}>
                    <Stack direction="row" align="center" gap={3}>
                      <IconBadge icon={StatusIcon} tone={tone} size="sm" />
                      <Stack gap={0} className="flex-1">
                        <Text size="sm" weight="medium">
                          {check.name}
                        </Text>
                        <Text size="xs" tone="muted" truncate>
                          {check.detail}
                        </Text>
                      </Stack>
                      <Stack gap={0} align="end">
                        <Text size="xs" weight="medium" tone={tone}>
                          {label}
                        </Text>
                        <Text size="xs" tone="muted" tabular>
                          {check.ms} ms
                        </Text>
                      </Stack>
                    </Stack>
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Host</CardTitle>
            <CardDescription>
              Up {formatDuration(host.uptimeSeconds)}, API up {formatDuration(host.apiUptimeSeconds)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Stack gap={5}>
              <Meter label="Memory" used={host.memoryTotal - host.memoryFree} total={host.memoryTotal} format={formatBytes} />
              <Meter label="Disk" used={host.diskTotal - host.diskFree} total={host.diskTotal} format={formatBytes} />
              <Meter label={`Load (1 min, ${host.cpus} CPUs)`} used={host.load[0]} total={host.cpus} format={(value) => value.toFixed(2)} />
            </Stack>
          </CardContent>
        </Card>
      </ChartGrid>
      <StatGrid>
        <Stat label="Builds running" value={`${builds.building} / ${builds.concurrency}`} />
        <Stat label="Builds queued" value={builds.queued} hint={oldestQueued} />
        <Stat label="Failed builds, 24h" value={builds.failedLastDay} />
        <StatusBreakdown label="Apps by status">
          {data.apps.map((row) => (
            <Stack key={row.status} direction="row" align="center" gap={1}>
              <StatusBadge status={row.status} />
              <Text as="span" size="sm" tabular>
                {row.count}
              </Text>
            </Stack>
          ))}
        </StatusBreakdown>
      </StatGrid>
    </Stack>
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
    <Stack gap={6}>
      <AdminHeader title="Resources" description="Live health, and host and app usage sampled every 5 minutes (kept 30 days)." />
      <LiveHealth />
      <Stack direction="row" align="center" justify="between" gap={4} className="pt-2">
        <Heading level={2}>History</Heading>
        <SegmentedControl
          aria-label="History range"
          value={range}
          onValueChange={setRange}
          options={RESOURCE_RANGES.map((item) => ({ value: item, label: item }))}
        />
      </Stack>
      {!data && <Skeleton className="h-72 w-full rounded-xl" />}
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
          <ChartGrid>
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
                { key: "buildsRunning", label: "Running", color: "var(--chart-1)" },
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
          </ChartGrid>
          <TableCard title={`Heaviest apps in the last ${range}`}>
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
                      <Link to={`/admin/projects/${row.projectId}`} className="font-mono">
                        {row.slug}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Text as="span" size="sm" tone="muted">
                        {row.ownerEmail}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatBytes(row.avgMemory)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBytes(row.maxMemory)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.avgCpu.toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{row.maxCpu.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        </>
      )}
    </Stack>
  );
};

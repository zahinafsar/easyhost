import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pre } from "@/components/ui/code";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import {
  AdminHeader,
  ChartCard,
  ChartGrid,
  EmptyRow,
  PageSkeleton,
  Paginator,
  RangePicker,
  Stat,
  StatGrid,
  TableCard,
  formatNumber,
  formatPercent,
  formatRelative,
  formatSeconds,
  usePageParam,
  useAdminRange,
} from "@/components/admin-layout";

const DeploymentLog = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const { data } = useQuery(adminQuery().deployment(id));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Deployment log</DialogTitle>
          <DialogDescription>
            {data && (
              <>
                {data.deployment.app.slug}, {data.deployment.owner.email}, {formatDate(data.deployment.createdAt)}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {!data && <Skeleton className="h-96 w-full rounded-lg" />}
          {data && (
            <Stack gap={3}>
              <Stack direction="row" align="center" wrap gap={3}>
                <StatusBadge status={data.deployment.status} />
                <Text as="span" size="sm" tone="muted">
                  Step {data.deployment.step.toLowerCase()}
                </Text>
                {data.deployment.cloudBuildId && (
                  <Text as="span" size="xs" tone="muted" mono>
                    {data.deployment.cloudBuildId}
                  </Text>
                )}
              </Stack>
              <Pre tone="terminal" wrap className="max-h-[60vh] overflow-auto">
                {data.deployment.log || "No log output"}
              </Pre>
            </Stack>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

const AppCell = ({ slug, owner }: { slug: string; owner: string }) => {
  return (
    <>
      <Text size="sm" mono>
        {slug}
      </Text>
      <Text size="xs" tone="muted">
        {owner}
      </Text>
    </>
  );
};

export const AdminBuildsPage = () => {
  const { days } = useAdminRange();
  const { page, setPage } = usePageParam();
  const { data } = useQuery(adminQuery().builds(days, page));
  const [logId, setLogId] = useState<string | null>(null);

  return (
    <Stack gap={6}>
      <AdminHeader title="Builds" description="Cloud Build runs, durations, queue wait and failures." action={<RangePicker />} />
      {!data && <PageSkeleton />}
      {data && (
        <>
          <StatGrid>
            <Stat label="Builds" value={formatNumber(data.current.total)} current={data.current.total} previous={data.previous.total} hint={`${data.current.cancelled} replaced in queue`} />
            <Stat
              label="Success rate"
              value={formatPercent(data.current.successRate)}
              current={data.current.successRate}
              previous={data.previous.successRate}
              hint={`${formatNumber(data.current.failed)} failed`}
            />
            <Stat
              label="Build time (median)"
              value={formatSeconds(data.current.durationP50)}
              current={data.current.durationP50}
              previous={data.previous.durationP50}
              invert
              hint={`p95 ${formatSeconds(data.current.durationP95)}`}
            />
            <Stat
              label="Queue wait (median)"
              value={formatSeconds(data.current.waitP50)}
              current={data.current.waitP50}
              previous={data.previous.waitP50}
              invert
              hint={`p95 ${formatSeconds(data.current.waitP95)}`}
            />
          </StatGrid>
          <ChartGrid>
            <ChartCard
              title="Builds per day"
              type="bar"
              stacked
              data={data.series}
              xKey="day"
              series={[
                { key: "succeeded", label: "Succeeded", color: "var(--chart-1)" },
                { key: "failed", label: "Failed", color: "var(--chart-4)" },
                { key: "cancelled", label: "Replaced", color: "var(--chart-5)" },
              ]}
            />
            <ChartCard title="Median build time" type="line" data={data.series} xKey="day" series={[{ key: "durationP50", label: "Median" }]} format={(value) => formatSeconds(value)} />
          </ChartGrid>
          <ChartGrid>
            <TableCard title="Queue right now">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Queued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.queue.length === 0 && <EmptyRow colSpan={3}>Nothing is building</EmptyRow>}
                  {data.queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <AppCell slug={item.slug} owner={item.ownerEmail} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        <Text as="span" size="sm" tone="muted">
                          {formatRelative(item.createdAt)}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
            <TableCard title="Apps failing most">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead>Last failure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topFailing.length === 0 && <EmptyRow colSpan={3}>No failures in this period</EmptyRow>}
                  {data.topFailing.map((row) => (
                    <TableRow key={row.appId}>
                      <TableCell>
                        <AppCell slug={row.slug} owner={row.ownerEmail} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.failures} / {row.total}
                      </TableCell>
                      <TableCell>
                        <Text as="span" size="sm" tone="muted">
                          {formatRelative(row.lastFailure)}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          </ChartGrid>
          <TableCard title="Failed builds" footer={<Paginator page={data.page} pages={data.pages} total={data.failuresTotal} label="failed builds" onPage={setPage} />}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Failed at step</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.failures.length === 0 && <EmptyRow colSpan={6}>No failed builds in this period</EmptyRow>}
                {data.failures.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link to={`/admin/projects/${item.app.projectId}`} className="font-mono">
                        {item.app.slug}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/users/${item.owner.id}`} variant="muted">
                        {item.owner.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Text as="span" size="sm" className="capitalize">
                        {item.step.toLowerCase()}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatSeconds(item.durationSeconds)}</TableCell>
                    <TableCell>
                      <Text as="span" size="sm" tone="muted">
                        {formatDate(item.createdAt)}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => setLogId(item.id)}>
                        <ScrollText />
                        Log
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        </>
      )}
      {logId && <DeploymentLog id={logId} onClose={() => setLogId(null)} />}
    </Stack>
  );
};

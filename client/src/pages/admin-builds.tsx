import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import {
  AdminHeader,
  ChartCard,
  EmptyRow,
  PageSkeleton,
  Paginator,
  RangePicker,
  Stat,
  StatGrid,
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
      <DialogContent className="sm:max-w-4xl">
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
        {!data && <Skeleton className="h-96 w-full" />}
        {data && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <StatusBadge status={data.deployment.status} />
              <span className="text-muted-foreground">Step {data.deployment.step.toLowerCase()}</span>
              {data.deployment.cloudBuildId && <span className="font-mono text-xs text-muted-foreground">{data.deployment.cloudBuildId}</span>}
            </div>
            <pre className="max-h-[60vh] overflow-auto bg-muted p-4 font-mono text-xs whitespace-pre-wrap">{data.deployment.log || "No log output"}</pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const AdminBuildsPage = () => {
  const { days } = useAdminRange();
  const { page, setPage } = usePageParam();
  const { data } = useQuery(adminQuery().builds(days, page));
  const [logId, setLogId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
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
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Builds per day"
              type="bar"
              stacked
              data={data.series}
              xKey="day"
              series={[
                { key: "succeeded", label: "Succeeded", color: "var(--chart-2)" },
                { key: "failed", label: "Failed", color: "var(--destructive)" },
                { key: "cancelled", label: "Replaced", color: "var(--muted-foreground)" },
              ]}
            />
            <ChartCard title="Median build time" type="line" data={data.series} xKey="day" series={[{ key: "durationP50", label: "Median" }]} format={(value) => formatSeconds(value)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>Queue right now</CardDescription>
              </CardHeader>
              <CardContent>
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
                          <p className="font-mono text-sm">{item.slug}</p>
                          <p className="text-xs text-muted-foreground">{item.ownerEmail}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatRelative(item.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Apps failing most</CardDescription>
              </CardHeader>
              <CardContent>
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
                          <p className="font-mono text-sm">{row.slug}</p>
                          <p className="text-xs text-muted-foreground">{row.ownerEmail}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.failures} / {row.total}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatRelative(row.lastFailure)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardDescription>Failed builds</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <Link to={`/admin/projects/${item.app.projectId}`} className="font-mono text-sm hover:underline">
                          {item.app.slug}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/users/${item.owner.id}`} className="text-sm hover:underline">
                          {item.owner.email}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{item.step.toLowerCase()}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatSeconds(item.durationSeconds)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setLogId(item.id)}>
                          Log
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Paginator page={data.page} pages={data.pages} total={data.failuresTotal} label="failed builds" onPage={setPage} />
            </CardContent>
          </Card>
        </>
      )}
      {logId && <DeploymentLog id={logId} onClose={() => setLogId(null)} />}
    </div>
  );
};

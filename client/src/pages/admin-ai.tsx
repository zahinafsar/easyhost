import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery } from "@/lib/queries";
import { AdminHeader, ChartCard, EmptyRow, PageSkeleton, RangePicker, Stat, StatGrid, formatNumber, useAdminRange } from "@/components/admin-layout";

export const AdminAiPage = () => {
  const { days } = useAdminRange();
  const { data } = useQuery(adminQuery().ai(days));

  return (
    <div className="space-y-6">
      <AdminHeader title="AI Builder" description="Token spend, builder runs and AI apps." action={<RangePicker />} />
      {!data && <PageSkeleton />}
      {data && (
        <>
          <StatGrid>
            <Stat label="Tokens used" value={formatNumber(data.period.tokens.current)} current={data.period.tokens.current} previous={data.period.tokens.previous} />
            <Stat
              label="Paid tokens"
              value={formatNumber(data.period.paid.current)}
              current={data.period.paid.current}
              previous={data.period.paid.previous}
              hint={`${formatNumber(data.period.free.current)} free`}
            />
            <Stat label="Builder runs" value={formatNumber(data.period.runs.current)} current={data.period.runs.current} previous={data.period.runs.previous} />
            <Stat label="Builder users" value={formatNumber(data.period.users.current)} current={data.period.users.current} previous={data.period.users.previous} />
            <Stat label="AI apps" value={formatNumber(data.totals.aiApps)} />
            <Stat label="Unspent token balance" value={formatNumber(data.totals.outstandingBalance)} hint="Across all users" />
            <Stat label="Free builds used" value={formatNumber(data.totals.freeBuildsUsed)} />
            <div className="border bg-card p-4">
              <p className="text-xs text-muted-foreground">AI apps by state</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.totals.statuses.map((row) => (
                  <span key={row.status} className="flex items-center gap-1 text-sm tabular-nums">
                    <StatusBadge status={row.status} />
                    {row.count}
                  </span>
                ))}
              </div>
            </div>
          </StatGrid>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Tokens per day"
              type="bar"
              stacked
              data={data.series}
              xKey="day"
              series={[
                { key: "paid", label: "Paid", color: "var(--chart-1)" },
                { key: "free", label: "Free", color: "var(--chart-2)" },
              ]}
            />
            <ChartCard title="Builder runs per day" type="line" data={data.series} xKey="day" series={[{ key: "runs", label: "Runs", color: "var(--chart-3)" }]} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>Top users by tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topUsers.length === 0 && <EmptyRow colSpan={4}>No usage in this period</EmptyRow>}
                    {data.topUsers.map((row) => (
                      <TableRow key={row.userId}>
                        <TableCell>
                          <Link to={`/admin/users/${row.userId}`} className="text-sm hover:underline">
                            {row.email}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(row.tokens)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(row.runs)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(row.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Top apps by tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Input / output</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topApps.length === 0 && <EmptyRow colSpan={4}>No usage in this period</EmptyRow>}
                    {data.topApps.map((row) => (
                      <TableRow key={`${row.appId}-${row.appName}`}>
                        <TableCell>
                          <p className="font-mono text-sm">{row.appName}</p>
                          {!row.appId && <p className="text-xs text-muted-foreground">Deleted</p>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(row.tokens)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(row.runs)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {formatNumber(row.inputTokens)} / {formatNumber(row.outputTokens)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

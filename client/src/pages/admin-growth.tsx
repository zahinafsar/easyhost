import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminQuery } from "@/lib/queries";
import { AdminHeader, ChartCard, EmptyRow, PageSkeleton, RangePicker, Stat, StatGrid, formatNumber, formatPercent, useAdminRange } from "@/components/admin-layout";

const percentOf = (part: number, whole: number) => {
  if (whole <= 0) {
    return null;
  }
  return Math.round((part / whole) * 1000) / 10;
};

export const AdminGrowthPage = () => {
  const { days } = useAdminRange();
  const { data } = useQuery(adminQuery().growth(days));

  return (
    <div className="space-y-6">
      <AdminHeader title="Growth" description="Signups, activation and what new users build." action={<RangePicker />} />
      {!data && <PageSkeleton />}
      {data && (
        <>
          <StatGrid>
            <Stat label="Signups" value={formatNumber(data.funnel.signedUp)} hint={`Last ${days} days`} />
            <Stat label="Verified" value={formatPercent(percentOf(data.funnel.verified, data.funnel.signedUp))} hint={`${formatNumber(data.funnel.verified)} users`} />
            <Stat label="Deployed something" value={formatPercent(percentOf(data.funnel.deployed, data.funnel.signedUp))} hint={`${formatNumber(data.funnel.deployed)} users`} />
            <Stat label="Upgraded to Pro" value={formatPercent(percentOf(data.funnel.pro, data.funnel.signedUp))} hint={`${formatNumber(data.funnel.pro)} users`} />
          </StatGrid>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Total users"
              value={formatNumber(data.cumulative[data.cumulative.length - 1]?.users ?? 0)}
              data={data.cumulative}
              xKey="day"
              series={[{ key: "users", label: "Users" }]}
            />
            <ChartCard
              title="Daily signups"
              type="bar"
              stacked
              data={data.series.map((row) => ({ day: row.day, verified: row.verified, unverified: row.signups - row.verified }))}
              xKey="day"
              series={[
                { key: "verified", label: "Verified", color: "var(--chart-2)" },
                { key: "unverified", label: "Unverified", color: "var(--chart-4)" },
              ]}
            />
            <ChartCard
              title="New projects and apps"
              type="line"
              data={data.series}
              xKey="day"
              series={[
                { key: "projects", label: "Projects" },
                { key: "apps", label: "Node apps" },
                { key: "aiApps", label: "AI apps" },
              ]}
            />
            <Card>
              <CardHeader>
                <CardDescription>Activation funnel</CardDescription>
                <CardTitle>Users who signed up in the last {days} days</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Signed up", value: data.funnel.signedUp },
                  { label: "Verified email", value: data.funnel.verified },
                  { label: "Created a project", value: data.funnel.createdProject },
                  { label: "Deployed an app", value: data.funnel.deployed },
                  { label: "Upgraded to Pro", value: data.funnel.pro },
                ].map((step) => {
                  const percent = percentOf(step.value, data.funnel.signedUp) ?? 0;
                  return (
                    <div key={step.label}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span>{step.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatNumber(step.value)} ({percent}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardDescription>Top email domains among new signups</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-right">Signups</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.domains.length === 0 && <EmptyRow colSpan={3}>No signups in this period</EmptyRow>}
                  {data.domains.map((row) => (
                    <TableRow key={row.domain}>
                      <TableCell className="font-mono text-sm">{row.domain}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(percentOf(row.count, data.funnel.signedUp))}</TableCell>
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

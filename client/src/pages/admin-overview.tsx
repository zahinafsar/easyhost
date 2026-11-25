import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  AdminHeader,
  ChartCard,
  PageSkeleton,
  RangePicker,
  Stat,
  StatGrid,
  formatMoney,
  formatNumber,
  formatPercent,
  useAdminRange,
} from "@/components/admin-layout";

export const AdminOverviewPage = () => {
  const { days } = useAdminRange();
  const { data } = useQuery(adminQuery().overview(days));
  const health = useQuery(adminQuery().health());

  return (
    <div className="space-y-6">
      <AdminHeader title="Overview" description={`Platform activity over the last ${days} days, compared with the ${days} days before.`} action={<RangePicker />} />
      {!data && <PageSkeleton />}
      {data && (
        <>
          <StatGrid>
            <Stat
              label="Users"
              value={formatNumber(data.totals.users)}
              current={data.period.signups.current}
              previous={data.period.signups.previous}
              hint={`${formatNumber(data.period.signups.current)} new`}
              href="/admin/users"
            />
            <Stat label="Active users" value={formatNumber(data.active.week)} hint={`${data.active.day} today, ${data.active.month} in 30d`} />
            <Stat
              label="MRR"
              value={formatMoney(data.totals.mrr)}
              hint={`${data.totals.proSubscribers} Pro, ${formatPercent(data.totals.conversionRate)} of verified`}
              href="/admin/revenue"
            />
            <Stat
              label="Revenue"
              value={formatMoney(data.period.revenue.current)}
              current={data.period.revenue.current}
              previous={data.period.revenue.previous}
              href="/admin/revenue"
            />
            <Stat
              label="Projects"
              value={formatNumber(data.totals.projects)}
              current={data.period.projects.current}
              previous={data.period.projects.previous}
              hint={`${formatNumber(data.period.projects.current)} new`}
              href="/admin/projects"
            />
            <Stat label="Running apps" value={`${formatNumber(data.totals.runningApps)} / ${formatNumber(data.totals.apps)}`} hint={`${data.totals.domains} custom domains`} />
            <Stat
              label="Build success"
              value={formatPercent(data.period.successRate.current)}
              current={data.period.successRate.current}
              previous={data.period.successRate.previous}
              hint={`${formatNumber(data.period.deployments.current)} builds`}
              href="/admin/builds"
            />
            <Stat
              label="AI tokens used"
              value={formatNumber(data.period.tokens.current)}
              current={data.period.tokens.current}
              previous={data.period.tokens.previous}
              href="/admin/ai"
            />
          </StatGrid>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Signups and new projects"
              data={data.series}
              xKey="day"
              series={[
                { key: "signups", label: "Signups" },
                { key: "projects", label: "Projects" },
              ]}
            />
            <ChartCard
              title="Deployments"
              type="bar"
              stacked
              data={data.series.map((row) => ({ day: row.day, other: row.deployments - row.failed, failed: row.failed }))}
              xKey="day"
              series={[
                { key: "other", label: "Not failed", color: "var(--chart-2)" },
                { key: "failed", label: "Failed", color: "var(--destructive)" },
              ]}
            />
            <ChartCard title="AI tokens" data={data.series} xKey="day" series={[{ key: "tokens", label: "Tokens", color: "var(--chart-4)" }]} />
            <Card>
              <CardHeader>
                <CardDescription>Platform</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {formatNumber(data.totals.databases)} databases, {formatNumber(data.totals.buckets)} buckets
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {health.data?.checks.map((check) => (
                  <div key={check.name} className="flex items-center gap-3 py-2.5">
                    {check.ok ? <CircleCheck className="size-4 shrink-0 text-emerald-600" /> : <CircleX className="size-4 shrink-0 text-destructive" />}
                    <span className="flex-1 text-sm">{check.name}</span>
                    <span className={cn("text-xs", check.ok ? "text-muted-foreground" : "text-destructive")}>{check.detail}</span>
                  </div>
                ))}
                <div className="pt-3 text-sm">
                  <Link to="/admin/resources" className="text-muted-foreground underline-offset-4 hover:underline">
                    Open resources
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

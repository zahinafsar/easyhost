import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleX } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/components/ui/link";
import { List, ListItem } from "@/components/ui/list";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { adminQuery } from "@/lib/queries";
import {
  AdminHeader,
  ChartCard,
  ChartGrid,
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
    <Stack gap={6}>
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
          <ChartGrid>
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
                { key: "other", label: "Not failed", color: "var(--chart-1)" },
                { key: "failed", label: "Failed", color: "var(--chart-4)" },
              ]}
            />
            <ChartCard title="AI tokens" data={data.series} xKey="day" series={[{ key: "tokens", label: "Tokens", color: "var(--chart-1)" }]} />
            <Card>
              <CardHeader>
                <CardDescription>Platform</CardDescription>
                <CardTitle className="text-[26px] leading-tight tracking-[-0.035em] tabular-nums">
                  {formatNumber(data.totals.databases)} databases, {formatNumber(data.totals.buckets)} buckets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <List variant="divided">
                  {health.data?.checks.map((check) => {
                    let StatusIcon = CircleX;
                    let tone: "success" | "danger" = "danger";
                    let detailTone: "muted" | "danger" = "danger";
                    if (check.ok) {
                      StatusIcon = CircleCheck;
                      tone = "success";
                      detailTone = "muted";
                    }
                    return (
                      <ListItem key={check.name}>
                        <Stack direction="row" align="center" gap={3}>
                          <Icon icon={StatusIcon} tone={tone} />
                          <Text as="span" size="sm" className="flex-1">
                            {check.name}
                          </Text>
                          <Text as="span" size="xs" tone={detailTone} truncate>
                            {check.detail}
                          </Text>
                        </Stack>
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
              <CardFooter className="mt-auto">
                <Link to="/admin/resources" variant="muted">
                  Open resources
                </Link>
              </CardFooter>
            </Card>
          </ChartGrid>
        </>
      )}
    </Stack>
  );
};

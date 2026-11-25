import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { adminQuery } from "@/lib/queries";
import {
  AdminHeader,
  ChartCard,
  ChartGrid,
  EmptyRow,
  PageSkeleton,
  RangePicker,
  Stat,
  StatGrid,
  TableCard,
  formatNumber,
  formatPercent,
  useAdminRange,
} from "@/components/admin-layout";

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
    <Stack gap={6}>
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
          <ChartGrid>
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
                { key: "verified", label: "Verified", color: "var(--chart-1)" },
                { key: "unverified", label: "Unverified", color: "var(--chart-2)" },
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
              <CardContent>
                <Stack gap={4}>
                  {[
                    { label: "Signed up", value: data.funnel.signedUp },
                    { label: "Verified email", value: data.funnel.verified },
                    { label: "Created a project", value: data.funnel.createdProject },
                    { label: "Deployed an app", value: data.funnel.deployed },
                    { label: "Upgraded to Pro", value: data.funnel.pro },
                  ].map((step) => {
                    const percent = percentOf(step.value, data.funnel.signedUp) ?? 0;
                    return (
                      <Stack key={step.label} gap={2}>
                        <Stack direction="row" align="baseline" justify="between" gap={3}>
                          <Text size="sm" weight="medium">
                            {step.label}
                          </Text>
                          <Text size="xs" tone="muted" mono tabular>
                            {formatNumber(step.value)} ({percent}%)
                          </Text>
                        </Stack>
                        <Progress value={percent} size="lg" />
                      </Stack>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </ChartGrid>
          <TableCard title="Top email domains among new signups">
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
                    <TableCell>
                      <Text as="span" size="sm" mono>
                        {row.domain}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(percentOf(row.count, data.funnel.signedUp))}</TableCell>
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

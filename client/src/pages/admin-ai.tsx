import { useQuery } from "@tanstack/react-query";
import { Link } from "@/components/ui/link";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { StatusBadge } from "@/components/status-badge";
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
  StatusBreakdown,
  TableCard,
  formatNumber,
  useAdminRange,
} from "@/components/admin-layout";

export const AdminAiPage = () => {
  const { days } = useAdminRange();
  const { data } = useQuery(adminQuery().ai(days));

  return (
    <Stack gap={6}>
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
            <StatusBreakdown label="AI apps by state">
              {data.totals.statuses.map((row) => (
                <Stack key={row.status} direction="row" align="center" gap={1}>
                  <StatusBadge status={row.status} />
                  <Text as="span" size="sm" tabular>
                    {row.count}
                  </Text>
                </Stack>
              ))}
            </StatusBreakdown>
          </StatGrid>
          <ChartGrid>
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
          </ChartGrid>
          <ChartGrid>
            <TableCard title="Top users by tokens">
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
                        <Link to={`/admin/users/${row.userId}`}>{row.email}</Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.tokens)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.runs)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
            <TableCard title="Top apps by tokens">
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
                        <Text size="sm" mono>
                          {row.appName}
                        </Text>
                        {!row.appId && (
                          <Text size="xs" tone="muted">
                            Deleted
                          </Text>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.tokens)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.runs)}</TableCell>
                      <TableCell className="text-right">
                        <Text as="span" size="xs" tone="muted" tabular>
                          {formatNumber(row.inputTokens)} / {formatNumber(row.outputTokens)}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          </ChartGrid>
        </>
      )}
    </Stack>
  );
};

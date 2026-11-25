import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/components/ui/link";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
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
  formatMoney,
  formatNumber,
  formatPercent,
  usePageParam,
  useAdminRange,
} from "@/components/admin-layout";

type EventVariant = "success" | "info" | "destructive" | "warning" | "muted";

const EVENT_VARIANTS: Record<string, EventVariant> = {
  CREATED: "success",
  RENEWED: "info",
  REACTIVATED: "success",
  PAYMENT_FAILED: "destructive",
  CANCELLED: "warning",
  EXPIRED: "muted",
};

const EVENT_LABELS: Record<string, string> = {
  CREATED: "New subscription",
  RENEWED: "Renewal",
  REACTIVATED: "Reactivated",
  PAYMENT_FAILED: "Payment failed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const amountText = (amount: number) => {
  if (amount > 0) {
    return formatMoney(amount);
  }
  return "-";
};

export const AdminRevenuePage = () => {
  const { days } = useAdminRange();
  const { page, setPage } = usePageParam();
  const { data } = useQuery(adminQuery().revenue(days, page));

  return (
    <Stack gap={6}>
      <AdminHeader title="Revenue" description="Pro subscriptions and payments." action={<RangePicker />} />
      {!data && <PageSkeleton />}
      {data && (
        <>
          <StatGrid>
            <Stat label="MRR" value={formatMoney(data.totals.mrr)} hint={`${formatMoney(data.totals.arr)} ARR`} />
            <Stat label="Pro subscribers" value={formatNumber(data.totals.active)} hint={`${formatPercent(data.totals.conversionRate)} of verified users`} />
            <Stat
              label="Revenue"
              value={formatMoney(data.period.revenue.current)}
              current={data.period.revenue.current}
              previous={data.period.revenue.previous}
              hint={`${formatMoney(data.totals.lifetimeRevenue)} lifetime`}
            />
            <Stat label="New subscriptions" value={formatNumber(data.period.created.current)} current={data.period.created.current} previous={data.period.created.previous} />
            <Stat label="Renewals" value={formatNumber(data.period.renewed.current)} current={data.period.renewed.current} previous={data.period.renewed.previous} />
            <Stat label="Churned" value={formatNumber(data.period.churned.current)} current={data.period.churned.current} previous={data.period.churned.previous} invert />
            <Stat label="Failed payments" value={formatNumber(data.period.failed.current)} current={data.period.failed.current} previous={data.period.failed.previous} invert />
            <Stat label="Past due now" value={formatNumber(data.totals.pastDue)} hint={`${data.totals.cancelling} cancelling at period end`} />
          </StatGrid>
          <ChartGrid>
            <ChartCard title="Pro subscribers" data={data.series} xKey="day" series={[{ key: "subscribers", label: "Subscribers" }]} />
            <ChartCard title="Revenue" type="bar" data={data.series} xKey="day" series={[{ key: "revenue", label: "Revenue", color: "var(--chart-1)" }]} format={formatMoney} />
            <ChartCard
              title="New and churned"
              type="bar"
              data={data.series}
              xKey="day"
              className="lg:col-span-2"
              series={[
                { key: "created", label: "New", color: "var(--chart-1)" },
                { key: "churned", label: "Churned", color: "var(--chart-4)" },
              ]}
            />
          </ChartGrid>
          {data.pastDue.length > 0 && (
            <TableCard title="Past due subscriptions">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Next renewal</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pastDue.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link to={`/admin/users/${row.user.id}`}>{row.user.email}</Link>
                      </TableCell>
                      <TableCell>
                        <Text as="span" size="sm" tone="muted">
                          {formatDate(row.renewsAt)}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Text as="span" size="sm" tone="muted">
                          {formatDate(row.updatedAt)}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          )}
          <TableCard title="Billing events" footer={<Paginator page={data.page} pages={data.pages} total={data.eventsTotal} label="events" onPage={setPage} />}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.length === 0 && <EmptyRow colSpan={4}>No billing events yet</EmptyRow>}
                {data.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Badge variant={EVENT_VARIANTS[event.type] ?? "secondary"}>{EVENT_LABELS[event.type] ?? event.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {event.user && (
                        <Link to={`/admin/users/${event.user.id}`} variant="muted">
                          {event.user.email}
                        </Link>
                      )}
                      {!event.user && (
                        <Text as="span" size="sm" tone="muted">
                          Deleted user
                        </Text>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{amountText(event.amount)}</TableCell>
                    <TableCell>
                      <Text as="span" size="sm" tone="muted">
                        {formatDate(event.createdAt)}
                      </Text>
                    </TableCell>
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

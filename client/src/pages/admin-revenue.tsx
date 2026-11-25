import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AdminHeader,
  ChartCard,
  EmptyRow,
  PageSkeleton,
  Paginator,
  RangePicker,
  Stat,
  StatGrid,
  formatMoney,
  formatNumber,
  formatPercent,
  usePageParam,
  useAdminRange,
} from "@/components/admin-layout";

const EVENT_STYLES: Record<string, string> = {
  CREATED: "bg-emerald-100 text-emerald-800",
  RENEWED: "bg-blue-100 text-blue-800",
  REACTIVATED: "bg-emerald-100 text-emerald-800",
  PAYMENT_FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-amber-100 text-amber-800",
  EXPIRED: "bg-slate-100 text-slate-700",
};

const EVENT_LABELS: Record<string, string> = {
  CREATED: "New subscription",
  RENEWED: "Renewal",
  REACTIVATED: "Reactivated",
  PAYMENT_FAILED: "Payment failed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const AdminRevenuePage = () => {
  const { days } = useAdminRange();
  const { page, setPage } = usePageParam();
  const { data } = useQuery(adminQuery().revenue(days, page));

  return (
    <div className="space-y-6">
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
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Pro subscribers" data={data.series} xKey="day" series={[{ key: "subscribers", label: "Subscribers" }]} />
            <ChartCard title="Revenue" type="bar" data={data.series} xKey="day" series={[{ key: "revenue", label: "Revenue", color: "var(--chart-2)" }]} format={formatMoney} />
            <ChartCard
              title="New and churned"
              type="bar"
              data={data.series}
              xKey="day"
              className="lg:col-span-2"
              series={[
                { key: "created", label: "New", color: "var(--chart-2)" },
                { key: "churned", label: "Churned", color: "var(--destructive)" },
              ]}
            />
          </div>
          {data.pastDue.length > 0 && (
            <Card>
              <CardHeader>
                <CardDescription>Past due subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
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
                          <Link to={`/admin/users/${row.user.id}`} className="font-medium hover:underline">
                            {row.user.email}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(row.renewsAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(row.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardDescription>Billing events</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <Badge variant="secondary" className={cn("font-medium", EVENT_STYLES[event.type])}>
                          {EVENT_LABELS[event.type] ?? event.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.user && (
                          <Link to={`/admin/users/${event.user.id}`} className="text-sm hover:underline">
                            {event.user.email}
                          </Link>
                        )}
                        {!event.user && <span className="text-sm text-muted-foreground">Deleted user</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{event.amount > 0 ? formatMoney(event.amount) : "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(event.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Paginator page={data.page} pages={data.pages} total={data.eventsTotal} label="events" onPage={setPage} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

import { useState } from "react";
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Activity,
  ArrowLeft,
  BrushCleaning,
  CreditCard,
  FolderKanban,
  Hammer,
  LayoutDashboard,
  Menu,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Box } from "@/components/ui/box";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Container } from "@/components/ui/container";
import { Grid } from "@/components/ui/grid";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/ui/image";
import { Link, NavItem } from "@/components/ui/link";
import { Pagination } from "@/components/ui/pagination";
import { Pill } from "@/components/ui/pill";
import { Progress } from "@/components/ui/progress";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Stat as StatBase, StatGroup, type StatDelta } from "@/components/ui/stat";
import { TableEmpty } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { cn } from "@/lib/utils";

const INSIGHTS_NAV = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/growth", label: "Growth", icon: TrendingUp },
  { to: "/admin/revenue", label: "Revenue", icon: CreditCard },
  { to: "/admin/builds", label: "Builds", icon: Hammer },
  { to: "/admin/ai", label: "AI Builder", icon: Sparkles },
  { to: "/admin/resources", label: "Resources", icon: Activity },
];

const MANAGE_NAV = [
  { to: "/admin/users", label: "Users", icon: UserRound },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/cleanup", label: "Cleanup", icon: BrushCleaning },
];

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
];

export const IMPERSONATE_NOTICE = "You will be signed in as this user for up to 2 hours. Anything you change is changed in their account. Use Stop impersonating to return.";

const numberFormat = new Intl.NumberFormat();
const compactFormat = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const moneyFormat = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const formatNumber = (value: number) => numberFormat.format(Math.round(value));

export const formatCompact = (value: number) => compactFormat.format(value);

export const formatMoney = (value: number) => moneyFormat.format(value);

export const formatPercent = (value: number | null) => {
  if (value === null) {
    return "-";
  }
  return `${value}%`;
};

export const formatSeconds = (value: number | null) => {
  if (value === null) {
    return "-";
  }
  if (value < 60) {
    return `${Math.round(value)}s`;
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const formatRelative = (value: string | Date | null) => {
  if (!value) {
    return "Never";
  }
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) {
    return "Just now";
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  return `${Math.floor(seconds / 86400)}d ago`;
};

const formatDay = (value: string) => {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
};

const formatTime = (value: string) => {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const useAdminRange = () => {
  const [params, setParams] = useSearchParams();
  const parsed = Number(params.get("days"));
  let days = 30;
  if (RANGES.some((range) => range.days === parsed)) {
    days = parsed;
  }
  const setDays = (next: number) => {
    const updated = new URLSearchParams(params);
    updated.set("days", String(next));
    updated.delete("page");
    setParams(updated, { replace: true });
  };
  return { days, setDays };
};

export const usePageParam = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const setPage = (next: number) => {
    const updated = new URLSearchParams(params);
    updated.set("page", String(next));
    setParams(updated, { replace: true });
  };
  return { page, setPage };
};

export const RangePicker = () => {
  const { days, setDays } = useAdminRange();
  return (
    <SegmentedControl
      aria-label="Date range"
      value={String(days)}
      onValueChange={(value) => setDays(Number(value))}
      options={RANGES.map((range) => ({ value: String(range.days), label: range.label }))}
    />
  );
};

export const AdminHeader = ({ title, description, action }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) => {
  return <PageHeader title={title} description={description} action={action} className="mb-0" />;
};

const deltaPercent = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) {
      return 0;
    }
    return null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const buildDelta = (current: number | null | undefined, previous: number | null | undefined, invert: boolean): StatDelta | null => {
  if (typeof current !== "number" || typeof previous !== "number") {
    return null;
  }
  const change = deltaPercent(current, previous);
  if (change === 0) {
    return { value: "No change", tone: "muted" };
  }
  const up = current >= previous;
  let good = up;
  if (invert) {
    good = !up;
  }
  let text = "New";
  if (change !== null && change > 0) {
    text = `+${change}%`;
  } else if (change !== null) {
    text = `${change}%`;
  }
  let TrendIcon = TrendingDown;
  if (up) {
    TrendIcon = TrendingUp;
  }
  let tone: StatDelta["tone"] = "warning";
  if (good) {
    tone = "success";
  }
  return {
    value: (
      <>
        <TrendIcon />
        {text}
      </>
    ),
    tone,
  };
};

export const Stat = ({
  label,
  value,
  hint,
  current,
  previous,
  invert = false,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  current?: number | null;
  previous?: number | null;
  invert?: boolean;
  href?: string;
}) => {
  const delta = buildDelta(current, previous, invert);
  if (href) {
    return (
      <Link to={href} variant="plain" inline={false} className="block h-full rounded-xl">
        <StatBase label={label} value={value} delta={delta} hint={hint} className="h-full transition-[box-shadow,border-color] hover:border-border-strong" />
      </Link>
    );
  }
  return <StatBase label={label} value={value} delta={delta} hint={hint} className="h-full" />;
};

export const StatGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <StatGroup cols={4} className={cn("grid-cols-2", className)}>
      {children}
    </StatGroup>
  );
};

export const StatusBreakdown = ({ label, children }: { label: string; children: React.ReactNode }) => {
  return (
    <Card className="h-full gap-3 py-5">
      <CardContent className="px-5">
        <Stack gap={3}>
          <Text size="sm" tone="muted">
            {label}
          </Text>
          <Stack direction="row" wrap gap={2}>
            {children}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const Meter = ({ label, used, total, format }: { label: string; used: number; total: number; format: (value: number) => string }) => {
  let percent = 0;
  if (total > 0) {
    percent = Math.min(100, Math.round((used / total) * 100));
  }
  let tone: "success" | "warning" | "danger" = "success";
  if (percent >= 90) {
    tone = "danger";
  } else if (percent >= 75) {
    tone = "warning";
  }
  return (
    <Stack gap={2}>
      <Stack direction="row" align="baseline" justify="between" gap={3}>
        <Text size="sm" weight="medium">
          {label}
        </Text>
        <Text size="xs" tone="muted" tabular mono>
          {format(used)} of {format(total)} ({percent}%)
        </Text>
      </Stack>
      <Progress value={percent} tone={tone} size="lg" />
    </Stack>
  );
};

type Series = { key: string; label: string; color?: string };

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const ChartCard = <T extends Record<string, unknown>>({
  title,
  description,
  value,
  data,
  xKey,
  series,
  type = "area",
  stacked = false,
  time = false,
  format = formatCompact,
  height = 220,
  className,
}: {
  title: string;
  description?: string;
  value?: React.ReactNode;
  data: T[];
  xKey: keyof T & string;
  series: Series[];
  type?: "area" | "bar" | "line";
  stacked?: boolean;
  time?: boolean;
  format?: (value: number) => string;
  height?: number;
  className?: string;
}) => {
  const config: ChartConfig = Object.fromEntries(
    series.map((item, index) => [item.key, { label: item.label, color: item.color ?? PALETTE[index % PALETTE.length] }]),
  );
  let tickFormatter = formatDay;
  if (time) {
    tickFormatter = formatTime;
  }
  let stackId: string | undefined;
  if (stacked) {
    stackId = "stack";
  }
  const axes = [
    <CartesianGrid key="grid" vertical={false} strokeDasharray="3 4" />,
    <XAxis key="x" dataKey={String(xKey)} tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} tickFormatter={(tick) => tickFormatter(String(tick))} />,
    <YAxis key="y" tickLine={false} axisLine={false} width={48} tickFormatter={(tick) => format(Number(tick))} />,
    <ChartTooltip
      key="tooltip"
      content={
        <ChartTooltipContent
          labelFormatter={(_, payload) => tickFormatter(String(payload?.[0]?.payload?.[xKey] ?? ""))}
          formatter={(raw, name) => (
            <Stack direction="row" align="center" justify="between" gap={4} className="w-full">
              <Text as="span" size="xs" tone="muted">
                {config[String(name)]?.label}
              </Text>
              <Text as="span" size="xs" weight="medium" mono tabular>
                {format(Number(raw))}
              </Text>
            </Stack>
          )}
        />
      }
    />,
  ];
  if (series.length > 1) {
    axes.push(<ChartLegend key="legend" content={<ChartLegendContent />} />);
  }
  let chart: React.ReactElement;
  if (type === "bar") {
    chart = (
      <BarChart data={data} barCategoryGap="22%">
        {axes}
        {series.map((item, index) => {
          let radius: [number, number, number, number] = [6, 6, 6, 6];
          if (stacked && index < series.length - 1) {
            radius = [0, 0, 0, 0];
          } else if (stacked) {
            radius = [6, 6, 0, 0];
          }
          return <Bar key={item.key} dataKey={item.key} fill={`var(--color-${item.key})`} stackId={stackId} radius={radius} maxBarSize={28} />;
        })}
      </BarChart>
    );
  } else if (type === "line") {
    chart = (
      <LineChart data={data}>
        {axes}
        {series.map((item) => (
          <Line key={item.key} dataKey={item.key} type="monotone" stroke={`var(--color-${item.key})`} strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    );
  } else {
    chart = (
      <AreaChart data={data}>
        {axes}
        {series.map((item) => (
          <Area
            key={item.key}
            dataKey={item.key}
            type="monotone"
            stroke={`var(--color-${item.key})`}
            fill={`var(--color-${item.key})`}
            fillOpacity={0.12}
            strokeWidth={2.25}
            stackId={stackId}
          />
        ))}
      </AreaChart>
    );
  }
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        {value !== undefined && <CardTitle className="text-[26px] leading-none tracking-[-0.035em] tabular-nums">{value}</CardTitle>}
        {description && (
          <Text size="xs" tone="muted">
            {description}
          </Text>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 && (
          <Stack align="center" justify="center" className="rounded-lg bg-surface-2" style={{ height }}>
            <Text size="sm" tone="muted">
              No data yet
            </Text>
          </Stack>
        )}
        {data.length > 0 && (
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
            {chart}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export const ChartGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <Grid cols={2} className={cn("sm:grid-cols-1 lg:grid-cols-2", className)}>
      {children}
    </Grid>
  );
};

export const TableCard = ({
  title,
  description,
  action,
  footer,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => {
  const hasHeader = !!(title || description || action);
  return (
    <Card className={cn("min-w-0 gap-4 pb-2", footer && "pb-5", !hasHeader && "pt-2", className)}>
      {hasHeader && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      <CardContent className="px-0">{children}</CardContent>
      {footer && <CardFooter className="border-t pt-4">{footer}</CardFooter>}
    </Card>
  );
};

export const Paginator = ({ page, pages, total, label, onPage }: { page: number; pages: number; total: number; label: string; onPage: (page: number) => void }) => {
  return <Pagination className="w-full" page={page} pageCount={pages} onPageChange={onPage} summary={`${formatNumber(total)} ${label}, page ${page} of ${pages}`} />;
};

export const PageSkeleton = () => {
  return (
    <Stack gap={4}>
      <Grid cols={4}>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </Grid>
      <Skeleton className="h-72 w-full rounded-xl" />
    </Stack>
  );
};

export const EmptyRow = ({ colSpan, children }: { colSpan: number; children: React.ReactNode }) => {
  return <TableEmpty colSpan={colSpan}>{children}</TableEmpty>;
};

const sectionLabel = (pathname: string) => {
  const item = [...INSIGHTS_NAV, ...MANAGE_NAV].find((entry) => pathname === entry.to || pathname.startsWith(`${entry.to}/`));
  if (item) {
    return item.label;
  }
  return "Overview";
};

const AdminSidebar = ({ user, onNavigate }: { user: { name: string; email: string }; onNavigate?: () => void }) => {
  return (
    <Stack gap={6} className="h-full">
      <Stack direction="row" align="center" gap={2} className="px-1.5 pt-1">
        <Link to="/admin/overview" variant="plain" aria-label="Admin home" onClick={onNavigate}>
          <Logo />
        </Link>
        <Pill tone="inverse" size="sm" icon={ShieldCheck}>
          Admin
        </Pill>
      </Stack>
      <Stack as="nav" gap={1} aria-label="Admin">
        {INSIGHTS_NAV.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} onClick={onNavigate}>
            {item.label}
          </NavItem>
        ))}
        {MANAGE_NAV.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} onClick={onNavigate}>
            {item.label}
          </NavItem>
        ))}
      </Stack>
      <Box className="mt-auto rounded-2xl border border-border bg-surface-2 p-3">
        <Stack direction="row" align="center" gap={3}>
          <Avatar name={user.name} size="sm" />
          <Stack gap={0} className="flex-1">
            <Text as="span" size="sm" weight="medium" truncate>
              {user.name}
            </Text>
            <Text as="span" size="xs" tone="muted" truncate>
              {user.email}
            </Text>
          </Stack>
        </Stack>
        <Stack direction="row" align="center" justify="between" gap={2} className="mt-3">
          <ThemeToggle variant="segmented" />
          <Link to="/" variant="plain" inline={false} className={buttonVariants({ variant: "ghost", size: "sm" })} onClick={onNavigate}>
            <ArrowLeft />
            Dashboard
          </Link>
        </Stack>
      </Box>
    </Stack>
  );
};

export const AdminLayout = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (isLoading) {
    return (
      <Box className="flex min-h-dvh gap-3 p-3">
        <Skeleton className="hidden h-[calc(100dvh-1.5rem)] w-64 shrink-0 rounded-3xl md:block" />
        <Stack gap={3} className="flex-1">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-[calc(100dvh-6rem)] w-full rounded-3xl" />
        </Stack>
      </Box>
    );
  }
  if (!user) {
    return <Navigate to="/login?redirect=%2Fadmin" replace />;
  }
  if (user.role !== "ADMIN" || user.impersonatorId) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box className="flex min-h-dvh gap-3 p-2 md:p-3">
      <Box as="aside" className="sticky top-3 hidden h-[calc(100dvh-1.5rem)] w-64 shrink-0 overflow-y-auto rounded-3xl border border-border bg-surface p-3 scrollbar-thin md:block">
        <AdminSidebar user={user} />
      </Box>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="bg-surface p-3">
          <VisuallyHidden>
            <SheetHeader>
              <SheetTitle>Admin navigation</SheetTitle>
              <SheetDescription>Switch admin section</SheetDescription>
            </SheetHeader>
          </VisuallyHidden>
          <AdminSidebar user={user} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
      <Stack gap={3} className="min-w-0 flex-1">
        <Stack
          as="header"
          direction="row"
          align="center"
          justify="between"
          gap={3}
          className="sticky top-2 z-30 h-14 rounded-md border border-border bg-surface pr-2 pl-2 md:top-3 md:pl-5"
        >
          <Stack direction="row" align="center" gap={2} className="flex-1">
            <IconButton icon={Menu} label="Open navigation" variant="ghost" size="default" className="md:hidden" tooltip={false} onClick={() => setMobileNavOpen(true)} />
            <Stack direction="row" align="center" gap={2} className="h-9 min-w-0 rounded-md bg-surface-2 px-3.5 md:bg-transparent md:px-0">
              <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
              <Breadcrumb items={[{ label: "Admin", to: "/admin/overview" }, { label: sectionLabel(location.pathname) }]} />
            </Stack>
          </Stack>
          <Stack direction="row" align="center" gap={2}>
            <Link to="/" variant="plain" inline={false} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "hidden sm:inline-flex")}>
              <ArrowLeft />
              Back to dashboard
            </Link>
            <ThemeToggle className="md:hidden" />
          </Stack>
        </Stack>
        <Box as="main" className="min-w-0 flex-1 rounded-3xl border border-border bg-surface">
          <Container className="py-6 md:px-8 md:py-10">
            <Outlet />
          </Container>
        </Box>
      </Stack>
    </Box>
  );
};

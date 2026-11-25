import { NavLink, Navigate, Outlet, useSearchParams, Link } from "react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Activity,
  ArrowLeft,
  BrushCleaning,
  CreditCard,
  FolderKanban,
  Hammer,
  LayoutDashboard,
  ScrollText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/growth", label: "Growth", icon: TrendingUp },
  { to: "/admin/revenue", label: "Revenue", icon: CreditCard },
  { to: "/admin/builds", label: "Builds", icon: Hammer },
  { to: "/admin/ai", label: "AI Builder", icon: Sparkles },
  { to: "/admin/resources", label: "Resources", icon: Activity },
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
    <div className="flex border">
      {RANGES.map((range) => (
        <button
          key={range.days}
          type="button"
          onClick={() => setDays(range.days)}
          className={cn("px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted", range.days === days && "bg-foreground text-background hover:bg-foreground")}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

export const AdminHeader = ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
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
  let delta: React.ReactNode = null;
  if (typeof current === "number" && typeof previous === "number") {
    const change = deltaPercent(current, previous);
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
    if (change === 0) {
      delta = <span className="text-xs text-muted-foreground">No change</span>;
    } else {
      delta = (
        <span className={cn("flex items-center gap-1 text-xs font-medium", good ? "text-emerald-700" : "text-red-700")}>
          {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {text}
        </span>
      );
    }
  }
  const body = (
    <div className={cn("h-full border bg-card p-4", href && "transition-colors hover:bg-muted/50")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {delta}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
  if (href) {
    return <Link to={href}>{body}</Link>;
  }
  return body;
};

export const StatGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>{children}</div>;
};

export const Meter = ({ label, used, total, format }: { label: string; used: number; total: number; format: (value: number) => string }) => {
  let percent = 0;
  if (total > 0) {
    percent = Math.min(100, Math.round((used / total) * 100));
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {format(used)} of {format(total)} ({percent}%)
        </span>
      </div>
      <div className="mt-2 h-2 bg-muted">
        <div className={cn("h-full bg-primary", percent >= 90 && "bg-destructive")} style={{ width: `${percent}%` }} />
      </div>
    </div>
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
  const axes = [
    <CartesianGrid key="grid" vertical={false} />,
    <XAxis key="x" dataKey={String(xKey)} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={(tick) => tickFormatter(String(tick))} />,
    <YAxis key="y" tickLine={false} axisLine={false} width={48} tickFormatter={(tick) => format(Number(tick))} />,
    <ChartTooltip
      key="tooltip"
      content={
        <ChartTooltipContent
          labelFormatter={(_, payload) => tickFormatter(String(payload?.[0]?.payload?.[xKey] ?? ""))}
          formatter={(raw, name) => (
            <div className="flex w-full items-center justify-between gap-4">
              <span className="text-muted-foreground">{config[String(name)]?.label}</span>
              <span className="font-mono font-medium tabular-nums">{format(Number(raw))}</span>
            </div>
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
      <BarChart data={data}>
        {axes}
        {series.map((item) => (
          <Bar key={item.key} dataKey={item.key} fill={`var(--color-${item.key})`} stackId={stacked ? "stack" : undefined} />
        ))}
      </BarChart>
    );
  } else if (type === "line") {
    chart = (
      <LineChart data={data}>
        {axes}
        {series.map((item) => (
          <Line key={item.key} dataKey={item.key} type="monotone" stroke={`var(--color-${item.key})`} strokeWidth={2} dot={false} />
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
            fillOpacity={0.15}
            strokeWidth={2}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </AreaChart>
    );
  }
  return (
    <Card className={className}>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        {value !== undefined && <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {data.length === 0 && (
          <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
            No data yet
          </div>
        )}
        {data.length > 0 && (
          <ChartContainer config={config} className="w-full" style={{ height }}>
            {chart}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export const Paginator = ({ page, pages, total, label, onPage }: { page: number; pages: number; total: number; label: string; onPage: (page: number) => void }) => {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {formatNumber(total)} {label}, page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};

export const PageSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
};

export const EmptyRow = ({ colSpan, children }: { colSpan: number; children: React.ReactNode }) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
};

export const AdminLayout = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login?redirect=%2Fadmin" replace />;
  }
  if (user.role !== "ADMIN" || user.impersonatorId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5 font-semibold">
          <img src="/logo.svg" alt="" className="h-6 w-auto" />
          Reverhost
          <span className="bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none tracking-wide text-background">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn("flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground", isActive && "bg-muted font-medium text-foreground")
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="truncate px-3 text-sm font-medium">{user.name}</p>
          <p className="truncate px-3 text-xs text-muted-foreground">{user.email}</p>
          <Button asChild variant="ghost" size="sm" className="mt-2 w-full justify-start">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-1 overflow-x-auto border-b p-2 md:hidden">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("flex shrink-0 items-center gap-2 px-3 py-1.5 text-sm", isActive && "bg-muted font-medium")}>
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-7xl p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

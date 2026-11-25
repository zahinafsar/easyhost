import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipValueType } from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

type TooltipNameType = number | string;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> })
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

const useChart = () => {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
};

export const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, item]) => item.theme ?? item.color);
  if (!colorConfig.length) {
    return null;
  }
  const css = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const lines = colorConfig
        .map(([key, itemConfig]) => {
          const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
          if (!color) {
            return null;
          }
          return `  --color-${key}: ${color};`;
        })
        .filter(Boolean)
        .join("\n");
      return `${prefix} [data-chart=${id}] {\n${lines}\n}`;
    })
    .join("\n");
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

export const ChartContainer = ({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  initialDimension?: { width: number; height: number };
}) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border-strong [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
};

const getPayloadConfigFromPayload = (config: ChartConfig, payload: unknown, key: string) => {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }
  let payloadPayload: object | undefined;
  if ("payload" in payload && typeof payload.payload === "object" && payload.payload !== null) {
    payloadPayload = payload.payload;
  }
  let configLabelKey: string = key;
  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key as keyof typeof payloadPayload] === "string") {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }
  if (configLabelKey in config) {
    return config[configLabelKey];
  }
  return config[key];
};

export const ChartTooltip = RechartsPrimitive.Tooltip;

export const ChartTooltipContent = ({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  } & Omit<RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>, "accessibilityLayer">) => {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }
    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    let value: React.ReactNode = itemConfig?.label;
    if (!labelKey && typeof label === "string") {
      value = config[label]?.label ?? label;
    }
    if (labelFormatter) {
      return <div className={cn("font-medium text-foreground", labelClassName)}>{labelFormatter(value, payload)}</div>;
    }
    if (!value) {
      return null;
    }
    return <div className={cn("font-medium text-foreground", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div className={cn("grid min-w-[9rem] items-start gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground", className)}>
      {!nestLabel && tooltipLabel}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? item.payload?.fill ?? item.color;
            if (formatter && item?.value !== undefined && item.name) {
              return (
                <div key={index} className="flex w-full flex-wrap items-center gap-2">
                  {formatter(item.value, item.name, item, index, item.payload)}
                </div>
              );
            }
            let valueText = "";
            if (item.value != null) {
              valueText = String(item.value);
              if (typeof item.value === "number") {
                valueText = item.value.toLocaleString();
              }
            }
            return (
              <div key={index} className={cn("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === "dot" && "items-center")}>
                {itemConfig?.icon && <itemConfig.icon />}
                {!itemConfig?.icon && !hideIndicator && (
                  <div
                    className={cn("shrink-0 rounded-full border-(--color-border) bg-(--color-bg)", {
                      "h-2 w-2": indicator === "dot",
                      "w-1": indicator === "line",
                      "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                      "my-0.5": nestLabel && indicator === "dashed",
                    })}
                    style={{ "--color-bg": indicatorColor, "--color-border": indicatorColor } as React.CSSProperties}
                  />
                )}
                <div className={cn("flex flex-1 justify-between gap-3 leading-none", nestLabel && "items-end", !nestLabel && "items-center")}>
                  <div className="grid gap-1.5">
                    {nestLabel && tooltipLabel}
                    <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                  </div>
                  {item.value != null && <span className="font-mono font-medium text-foreground tabular-nums">{valueText}</span>}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export const ChartLegend = RechartsPrimitive.Legend;

export const ChartLegendContent = ({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & { hideIcon?: boolean; nameKey?: string } & RechartsPrimitive.DefaultLegendContentProps) => {
  const { config } = useChart();
  if (!payload?.length) {
    return null;
  }
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4", verticalAlign === "top" && "pb-3", verticalAlign !== "top" && "pt-3", className)}>
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          return (
            <div key={index} className="flex items-center gap-1.5 text-muted-foreground [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground">
              {itemConfig?.icon && !hideIcon && <itemConfig.icon />}
              {(!itemConfig?.icon || hideIcon) && <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
};

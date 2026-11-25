import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

const TONES: Record<string, Tone> = {
  RUNNING: "success",
  SENT: "success",
  ACTIVE: "success",
  QUEUED: "muted",
  IDLE: "muted",
  SUPERSEDED: "muted",
  BUILDING: "info",
  DEPLOYING: "info",
  GENERATING: "info",
  FAILED: "danger",
  STOPPED: "warning",
  PENDING: "warning",
};

const VARIANTS = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "info",
  muted: "muted",
} as const;

const PULSING = new Set(["BUILDING", "DEPLOYING", "GENERATING", "QUEUED"]);

export const StatusBadge = ({ status }: { status: string }) => {
  const tone = TONES[status] ?? "muted";
  return (
    <Badge variant={VARIANTS[tone]} className="gap-1.5 pl-2">
      <StatusDot tone={tone} pulse={PULSING.has(status)} className="size-1.5 [&>span]:size-1.5" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
};

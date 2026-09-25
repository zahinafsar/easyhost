import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  RUNNING: "bg-emerald-100 text-emerald-800",
  SENT: "bg-emerald-100 text-emerald-800",
  QUEUED: "bg-slate-100 text-slate-700",
  BUILDING: "bg-blue-100 text-blue-800",
  DEPLOYING: "bg-blue-100 text-blue-800",
  FAILED: "bg-red-100 text-red-800",
  STOPPED: "bg-amber-100 text-amber-800",
  SUPERSEDED: "bg-slate-100 text-slate-500",
  IDLE: "bg-slate-100 text-slate-700",
};

export const StatusBadge = ({ status }: { status: string }) => {
  return (
    <Badge variant="secondary" className={cn("font-medium", styles[status])}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
};

import { cn } from "@/lib/utils";

const TONES = {
  success: "bg-accent-green",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground/50",
};

export const StatusDot = ({ tone = "muted", pulse = false, label, className }: { tone?: keyof typeof TONES; pulse?: boolean; label?: string; className?: string }) => {
  return (
    <span data-slot="status-dot" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cn("relative inline-flex size-2 shrink-0", className)}>
      {pulse && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", TONES[tone])} />}
      <span className={cn("relative inline-flex size-2 rounded-full", TONES[tone])} />
    </span>
  );
};

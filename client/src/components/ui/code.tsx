import * as React from "react";
import { cn } from "@/lib/utils";

export const Code = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  return <code data-slot="code" className={cn("rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] break-words text-foreground", className)} {...props} />;
};

export const Pre = ({ className, tone = "default", wrap = false, ...props }: React.HTMLAttributes<HTMLPreElement> & { tone?: "default" | "terminal"; wrap?: boolean }) => {
  let toneClass = "border-border bg-surface-2 text-foreground";
  if (tone === "terminal") {
    toneClass = "border-white/8 bg-[#0a0c14] text-[#e6e9ef]";
  }
  let wrapClass = "overflow-x-auto whitespace-pre";
  if (wrap) {
    wrapClass = "whitespace-pre-wrap break-all";
  }
  return <pre data-slot="pre" className={cn("scrollbar-thin rounded-lg border p-4 font-mono text-xs leading-relaxed", toneClass, wrapClass, className)} {...props} />;
};

export const Kbd = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  return (
    <kbd
      data-slot="kbd"
      className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border bg-surface px-1 font-mono text-[10px] font-medium text-muted-foreground", className)}
      {...props}
    />
  );
};

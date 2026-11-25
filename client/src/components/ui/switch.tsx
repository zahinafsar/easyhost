import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Switch = ({ className, size = "default", ...props }: React.ComponentProps<typeof SwitchPrimitive.Root> & { size?: "sm" | "default" }) => {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong p-0.5 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-6 data-[size=default]:w-10 data-[size=sm]:h-5 data-[size=sm]:w-8 data-[state=checked]:bg-accent-green",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block rounded-full bg-white transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-4 data-[state=unchecked]:translate-x-0 group-data-[size=default]/switch:data-[state=checked]:translate-x-4 group-data-[size=sm]/switch:data-[state=checked]:translate-x-3" />
    </SwitchPrimitive.Root>
  );
};

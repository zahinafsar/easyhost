import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase } from "@/components/ui/input";

export const NativeSelect = ({ className, children, ...props }: React.ComponentProps<"select">) => {
  return (
    <div data-slot="native-select" className={cn("relative min-w-0", className)}>
      <select className={cn(inputBase, "h-10 cursor-pointer appearance-none py-2 pr-10")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
};

export const NativeSelectOption = (props: React.ComponentProps<"option">) => {
  return <option {...props} />;
};

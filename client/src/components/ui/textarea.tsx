import * as React from "react";
import { cn } from "@/lib/utils";
import { inputBase } from "@/components/ui/input";

export const Textarea = ({ className, ...props }: React.ComponentProps<"textarea">) => {
  return <textarea data-slot="textarea" className={cn(inputBase, "flex field-sizing-content min-h-20 py-2.5 leading-relaxed", className)} {...props} />;
};

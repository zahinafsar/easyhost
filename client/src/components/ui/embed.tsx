import * as React from "react";
import { cn } from "@/lib/utils";

export const Embed = ({ className, title, ...props }: React.IframeHTMLAttributes<HTMLIFrameElement> & { title: string; ref?: React.Ref<HTMLIFrameElement> }) => {
  return <iframe data-slot="embed" title={title} className={cn("block h-full w-full border-0", className)} {...props} />;
};

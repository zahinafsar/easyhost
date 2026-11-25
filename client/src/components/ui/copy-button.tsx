import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCopy } from "@/hooks/use-copy";

export const CopyButton = ({
  value,
  label = "Copy",
  showLabel = false,
  className,
  variant = "ghost",
  size,
  ...props
}: Omit<ButtonProps, "onClick" | "children" | "value"> & { value: string; label?: string; showLabel?: boolean }) => {
  const { copied, copy } = useCopy();
  let resolvedSize = size;
  if (!resolvedSize) {
    resolvedSize = "icon-xs";
    if (showLabel) {
      resolvedSize = "xs";
    }
  }
  let text = label;
  if (copied) {
    text = "Copied";
  }
  return (
    <Button type="button" variant={variant} size={resolvedSize} aria-label={text} className={cn(copied && "text-accent-green", className)} onClick={() => copy(value)} {...props}>
      {copied && <Check />}
      {!copied && <Copy />}
      {showLabel && text}
    </Button>
  );
};

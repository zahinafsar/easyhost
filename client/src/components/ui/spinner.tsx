import { LoaderCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("shrink-0 animate-spin", {
  variants: {
    size: {
      sm: "size-3.5",
      default: "size-4",
      lg: "size-6",
    },
    tone: {
      current: "text-current",
      muted: "text-muted-foreground",
      accent: "text-accent-green",
    },
  },
  defaultVariants: {
    size: "default",
    tone: "current",
  },
});

export const Spinner = ({ className, size, tone, label = "Loading" }: VariantProps<typeof spinnerVariants> & { className?: string; label?: string }) => {
  return <LoaderCircle role="status" aria-label={label} className={cn(spinnerVariants({ size, tone }), className)} />;
};

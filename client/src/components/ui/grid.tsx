import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Box, type BoxProps } from "@/components/ui/box";

const gridVariants = cva("grid min-w-0", {
  variants: {
    cols: {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
      6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
      "2-fixed": "grid-cols-2",
      "3-fixed": "grid-cols-3",
      sidebar: "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]",
      "sidebar-left": "grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]",
      auto: "grid-cols-[repeat(auto-fill,minmax(240px,1fr))]",
    },
    gap: {
      0: "gap-0",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      5: "gap-5",
      6: "gap-6",
      8: "gap-8",
    },
    align: {
      start: "items-start",
      center: "items-center",
      stretch: "items-stretch",
    },
  },
  defaultVariants: {
    cols: 2,
    gap: 4,
  },
});

export type GridProps = BoxProps & VariantProps<typeof gridVariants>;

export const Grid = ({ className, cols, gap, align, ...props }: GridProps) => {
  return <Box className={cn(gridVariants({ cols, gap, align }), className)} {...props} />;
};

export const GridItem = ({ className, span, ...props }: BoxProps & { span?: "full" | 2 | 3 }) => {
  let spanClass = "";
  if (span === "full") {
    spanClass = "col-span-full";
  } else if (span === 2) {
    spanClass = "sm:col-span-2";
  } else if (span === 3) {
    spanClass = "lg:col-span-3";
  }
  return <Box className={cn("min-w-0", spanClass, className)} {...props} />;
};

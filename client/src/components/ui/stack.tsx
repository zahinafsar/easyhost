import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Box, type BoxProps } from "@/components/ui/box";

const stackVariants = cva("flex", {
  variants: {
    direction: {
      column: "flex-col",
      row: "flex-row",
      "row-reverse": "flex-row-reverse",
      "column-reverse": "flex-col-reverse",
      responsive: "flex-col md:flex-row",
    },
    gap: {
      0: "gap-0",
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      5: "gap-5",
      6: "gap-6",
      8: "gap-8",
      10: "gap-10",
      12: "gap-12",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
      baseline: "items-baseline",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    },
    wrap: {
      true: "flex-wrap",
      false: "",
    },
    inline: {
      true: "inline-flex",
      false: "",
    },
  },
  defaultVariants: {
    direction: "column",
    gap: 4,
    wrap: false,
    inline: false,
  },
});

export type StackProps = BoxProps & VariantProps<typeof stackVariants>;

export const Stack = ({ className, direction, gap, align, justify, wrap, inline, ...props }: StackProps) => {
  return <Box className={cn(stackVariants({ direction, gap, align, justify, wrap, inline }), "min-w-0", className)} {...props} />;
};

export const HStack = ({ direction = "row", align = "center", ...props }: StackProps) => {
  return <Stack direction={direction} align={align} {...props} />;
};

export const VStack = ({ direction = "column", ...props }: StackProps) => {
  return <Stack direction={direction} {...props} />;
};

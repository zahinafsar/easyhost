import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Box, type BoxProps } from "@/components/ui/box";

const containerVariants = cva("mx-auto w-full px-4 sm:px-6", {
  variants: {
    size: {
      sm: "max-w-xl",
      md: "max-w-3xl",
      lg: "max-w-5xl",
      xl: "max-w-6xl",
      "2xl": "max-w-7xl",
      full: "max-w-none",
    },
  },
  defaultVariants: {
    size: "xl",
  },
});

export const Container = ({ className, size, ...props }: BoxProps & VariantProps<typeof containerVariants>) => {
  return <Box className={cn(containerVariants({ size }), className)} {...props} />;
};

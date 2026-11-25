import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva("relative inline-flex shrink-0 overflow-hidden rounded-full border border-border bg-surface-3", {
  variants: {
    size: {
      xs: "size-6 text-[10px]",
      sm: "size-8 text-xs",
      default: "size-9 text-[13px]",
      lg: "size-12 text-base",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const Avatar = ({ name, src, size, className }: VariantProps<typeof avatarVariants> & { name: string; src?: string | null; className?: string }) => {
  return (
    <AvatarPrimitive.Root data-slot="avatar" className={cn(avatarVariants({ size }), className)}>
      {src && <AvatarPrimitive.Image src={src} alt={name} className="aspect-square size-full object-cover" />}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center font-medium text-foreground">{initialsOf(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
};

export const AvatarGroup = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return <span className={cn("flex -space-x-2 [&>*]:ring-2 [&>*]:ring-surface", className)}>{children}</span>;
};

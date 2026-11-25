import * as React from "react";
import { cn } from "@/lib/utils";

export const Image = ({
  className,
  rounded = "none",
  fit,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string; rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full"; fit?: "cover" | "contain" }) => {
  const radius = {
    none: "",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  }[rounded];
  let fitClass = "";
  if (fit === "cover") {
    fitClass = "object-cover";
  } else if (fit === "contain") {
    fitClass = "object-contain";
  }
  return <img data-slot="image" alt={alt} className={cn("block max-w-full", radius, fitClass, className)} {...props} />;
};

export const Logo = ({ className, wordmark = true, beta = false, size = "default" }: { className?: string; wordmark?: boolean; beta?: boolean; size?: "sm" | "default" | "lg" }) => {
  const imageSize = { sm: "h-5", default: "h-6", lg: "h-8" }[size];
  const textSize = { sm: "text-sm", default: "text-[15px]", lg: "text-lg" }[size];
  return (
    <span data-slot="logo" className={cn("inline-flex items-center gap-2 font-semibold tracking-[-0.02em] text-foreground", textSize, className)}>
      <img src="/logo.svg" alt="" className={cn("w-auto dark:invert", imageSize)} />
      {wordmark && "Reverhost"}
      {beta && <span className="rounded-sm bg-success-soft px-1.5 py-0.5 text-[10px] leading-none font-medium tracking-wide text-success-foreground uppercase">Beta</span>}
    </span>
  );
};

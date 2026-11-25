import * as React from "react";
import { cn } from "@/lib/utils";

export type FormProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  preventDefault?: boolean;
  gap?: "sm" | "default" | "lg";
  ref?: React.Ref<HTMLFormElement>;
};

const GAPS = {
  sm: "gap-3",
  default: "gap-5",
  lg: "gap-6",
};

export const Form = ({ className, onSubmit, preventDefault = true, gap = "default", ...props }: FormProps) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (preventDefault) {
      event.preventDefault();
    }
    onSubmit?.(event);
  };
  return <form data-slot="form" className={cn("flex min-w-0 flex-col", GAPS[gap], className)} onSubmit={handleSubmit} {...props} />;
};

export const FormActions = ({ className, align = "end", ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" | "between" | "stretch" }) => {
  const alignClass = {
    start: "justify-start",
    end: "justify-end",
    between: "justify-between",
    stretch: "[&>*]:flex-1",
  }[align];
  return <div data-slot="form-actions" className={cn("flex flex-wrap items-center gap-2", alignClass, className)} {...props} />;
};

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export type FieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  required?: boolean;
  labelAside?: React.ReactNode;
  orientation?: "vertical" | "horizontal";
  className?: string;
  children: React.ReactNode;
};

export const Field = ({ label, htmlFor, error, required, labelAside, orientation = "vertical", className, children }: FieldProps) => {
  if (orientation === "horizontal") {
    return (
      <div data-slot="field" data-invalid={!!error || undefined} className={cn("flex min-w-0 flex-col gap-1.5", className)}>
        <div className="flex min-w-0 items-start gap-3">
          {children}
          {label && (
            <Label htmlFor={htmlFor} className="pt-0.5 leading-snug font-normal">
              {label}
            </Label>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <div data-slot="field" data-invalid={!!error || undefined} className={cn("flex min-w-0 flex-col gap-2", className)}>
      {(label || labelAside) && (
        <div className="flex min-w-0 items-center justify-between gap-2">
          {label && (
            <Label htmlFor={htmlFor}>
              {label}
              {required && <span className="text-muted-foreground">*</span>}
            </Label>
          )}
          {labelAside && <span className="shrink-0 text-xs">{labelAside}</span>}
        </div>
      )}
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export const FieldGroup = ({ className, cols = 1, ...props }: React.HTMLAttributes<HTMLDivElement> & { cols?: 1 | 2 | 3 }) => {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
  }[cols];
  return <div data-slot="field-group" className={cn("grid min-w-0 gap-4", colsClass, className)} {...props} />;
};

export const Fieldset = ({ legend, className, children, ...props }: React.FieldsetHTMLAttributes<HTMLFieldSetElement> & { legend?: React.ReactNode }) => {
  return (
    <fieldset data-slot="fieldset" className={cn("flex min-w-0 flex-col gap-4 disabled:opacity-60", className)} {...props}>
      {legend && <legend className="mb-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{legend}</legend>}
      {children}
    </fieldset>
  );
};

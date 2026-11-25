import { cn } from "@/lib/utils";

export type Fact = { label: string; value: React.ReactNode };

export const Facts = ({ items, className }: { items: Fact[]; className?: string }) => {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 truncate text-sm font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Pagination = ({
  page,
  pageCount,
  onPageChange,
  total,
  summary,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  total?: number;
  summary?: React.ReactNode;
  className?: string;
}) => {
  const safeCount = Math.max(pageCount, 1);
  let label: React.ReactNode = `Page ${page} of ${safeCount}`;
  if (summary) {
    label = summary;
  } else if (total !== undefined) {
    label = `Page ${page} of ${safeCount} (${total} total)`;
  }
  return (
    <nav aria-label="Pagination" data-slot="pagination" className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <span className="text-[13px] text-muted-foreground tabular-nums">{label}</span>
      <span className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft />
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= safeCount} onClick={() => onPageChange(page + 1)}>
          Next
          <ChevronRight />
        </Button>
      </span>
    </nav>
  );
};

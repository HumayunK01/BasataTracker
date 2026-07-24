import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  pageNumbers: (number | "…")[];
  onPageChange: (p: number) => void;
  /** When set, shows "Showing X–Y of Z" label */
  total?: number;
  pageSize?: number;
  showFirstLast?: boolean;
  itemsPerPage?: number;
  onItemsPerPageChange?: (n: number) => void;
}

export function Pagination({
  page,
  totalPages,
  pageNumbers,
  onPageChange,
  total,
  pageSize,
  showFirstLast = false,
  itemsPerPage,
  onItemsPerPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(totalPages, page + 1));

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2",
      total != null
        ? "border-t border-border/40 px-4 sm:px-5 py-3 justify-center sm:justify-between"
        : "shrink-0 py-2.5 relative justify-center",
    )}>
      {total != null && pageSize != null && (
        <span className="text-xs text-foreground font-medium">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} patients
        </span>
      )}

      <div className="flex items-center gap-1.5">
        {showFirstLast && (
          <Button
            size="sm"
            className="hidden sm:inline-flex h-8 px-3 text-sm rounded-md bg-sidebar border border-border text-foreground hover:bg-muted"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            First
          </Button>
        )}
        <Button
          size="icon"
          className={cn(
            "size-9 sm:size-8 rounded-md border border-border/40",
            total != null
              ? "text-foreground hover:text-foreground hover:bg-muted/80 active:scale-95"
              : "bg-sidebar text-foreground hover:bg-muted",
          )}
          onClick={prev}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${pageNumbers[i + 1] ?? i}`} className="w-8 text-center text-xs text-foreground select-none">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={page === p ? "default" : "ghost"}
              size="icon"
              className={cn(
                "size-9 sm:size-8 text-xs font-semibold rounded-md border active:scale-95",
                page === p
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/10"
                  : total != null
                    ? "border-border/40 text-foreground hover:text-foreground hover:bg-muted/80"
                    : "bg-sidebar text-foreground hover:bg-muted border-border",
              )}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          size="icon"
          className={cn(
            "size-9 sm:size-8 rounded-md border border-border/40",
            total != null
              ? "text-foreground hover:text-foreground hover:bg-muted/80 active:scale-95"
              : "bg-sidebar text-foreground hover:bg-muted",
          )}
          onClick={next}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        {showFirstLast && (
          <Button
            size="sm"
            className="hidden sm:inline-flex h-8 px-3 text-sm rounded-md bg-sidebar border border-border text-foreground hover:bg-muted"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            Last
          </Button>
        )}
      </div>

      {onItemsPerPageChange != null && itemsPerPage != null && (
        <div className="sm:absolute sm:right-0 hidden md:flex items-center gap-2 text-sm text-foreground">
          <span>Items per page</span>
          <Select value={String(itemsPerPage)} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

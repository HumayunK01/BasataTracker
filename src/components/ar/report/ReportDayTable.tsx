import { formatTableDate, isWeekend, totalForLog, type DailyLog } from "@/types/log";
import { colorForKey } from "@/lib/cat-colors";
import type { Category } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BedDouble, ChevronLeft, ChevronRight, Palmtree } from "lucide-react";

const TABLE_PAGE_SIZE = 20;

interface ReportDayTableProps {
  filtered: DailyLog[];
  categories: Category[];
  workingLogs: DailyLog[];
  totalDocs: number;
  avgPerDay: number;
  tablePage: number;
  totalTablePages: number;
  tablePageNumbers: (number | "…")[];
  paginatedRows: DailyLog[];
  onPageChange: (p: number) => void;
}

export function ReportDayTable({
  filtered,
  categories,
  workingLogs,
  totalDocs,
  avgPerDay,
  tablePage,
  totalTablePages,
  tablePageNumbers,
  paginatedRows,
  onPageChange,
}: ReportDayTableProps) {
  return (
    <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl overflow-hidden hover:border-primary/10 hover:shadow-sm transition-all duration-300 font-[system-ui]">
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-muted/[0.04]">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/95">Day-by-Day Breakdown</h2>
        <span className="text-[10px] text-muted-foreground sm:hidden font-medium bg-muted/40 border border-border/60 px-2 py-0.5 rounded">
          {"← swipe to scroll →"}
        </span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/40 bg-muted/[0.02]">
              <TableHead className="font-semibold text-xs text-muted-foreground w-[120px] px-5">Date</TableHead>
              {categories.map((c) => (
                <TableHead key={c.key} className="font-semibold text-xs text-center w-[72px] py-3.5">
                  <span className="font-bold font-mono text-[10px] px-2 py-0.5 rounded shadow-sm" style={{ backgroundColor: `${colorForKey(c.key)}18`, color: colorForKey(c.key) }}>
                    {c.short}
                  </span>
                </TableHead>
              ))}
              <TableHead className="font-semibold text-xs text-center text-foreground/80 w-[80px] py-3.5">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((l) => {
              const rowTotal = totalForLog(l);
              const isWeekendRow = isWeekend(l.log_date);
              
              return l.is_off_day ? (
                <TableRow key={l.id} className="border-b border-border/20 last:border-0 bg-muted/[0.08] hover:bg-muted/[0.12] transition-colors">
                  <TableCell className="tabular-nums text-sm font-medium py-3 px-5 text-muted-foreground">
                    {formatTableDate(l.log_date)}
                  </TableCell>
                  <TableCell colSpan={categories.length + 1} className="py-3">
                    <div className="flex items-center gap-2">
                      {isWeekendRow ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 animate-fade-in">
                          <BedDouble className="size-3 shrink-0" />
                          <span>WEEKEND</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 animate-fade-in">
                          <Palmtree className="size-3 shrink-0" />
                          <span>OFF DAY</span>
                        </div>
                      )}
                      {l.notes && (
                        <span className="text-[11px] text-muted-foreground/80 italic font-medium truncate max-w-[200px] sm:max-w-xs">
                          &ldquo;{l.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={l.id} className="border-b border-border/20 last:border-0 hover:bg-muted/[0.04] transition-colors">
                  <TableCell className="tabular-nums text-sm font-medium py-3 px-5">
                    {formatTableDate(l.log_date)}
                  </TableCell>
                  {categories.map((c) => {
                    const v = (l.counts ?? {})[c.key] ?? 0;
                    return (
                      <TableCell key={c.key} className="text-center tabular-nums text-sm py-3">
                        {v > 0 ? (
                          <span className="font-semibold" style={{ color: colorForKey(c.key) }}>
                            {v}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/20 font-light" aria-hidden="true">
                            {"—"}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center tabular-nums py-3">
                    <span className="font-black text-sm text-foreground/90">{rowTotal}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalTablePages > 1 && (
        <div className="border-t border-border/40 px-5 py-3 flex items-center justify-between gap-2 bg-muted/[0.02]">
          <span className="text-xs text-muted-foreground font-medium">
            Displaying {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length} log rows
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/40 rounded-lg active:scale-95 transition-all"
              onClick={() => onPageChange(Math.max(1, tablePage - 1))}
              disabled={tablePage === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {tablePageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${tablePageNumbers[i + 1] ?? i}`} className="w-8 text-center text-xs text-muted-foreground/60 select-none">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={tablePage === p ? "default" : "ghost"}
                  size="icon"
                  className={[
                    "size-8 text-xs font-semibold rounded-lg active:scale-95 transition-all border",
                    tablePage === p 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/10" 
                      : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  ].join(" ")}
                  onClick={() => onPageChange(p as number)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/40 rounded-lg active:scale-95 transition-all"
              onClick={() => onPageChange(Math.min(totalTablePages, tablePage + 1))}
              disabled={tablePage === totalTablePages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {workingLogs.length > 0 && (
        <div className="border-t border-border/40 px-5 py-3.5 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-muted-foreground/90 bg-muted/[0.06]">
          <span>
            Total Docs Processed: <span className="font-bold text-foreground">{totalDocs}</span>
          </span>
          <span className="text-border/80">|</span>
          <span>
            Working Shifts: <span className="font-bold text-foreground">{workingLogs.length}</span>
          </span>
          <span className="text-border/80">|</span>
          <span>
            Average document processing speed: <span className="font-bold text-foreground">{avgPerDay}</span> docs/day
          </span>
          <span className="text-border/80">|</span>
          {categories.map((c) => {
            const val = workingLogs.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0);
            return val > 0 ? (
              <span key={c.key} className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: colorForKey(c.key) }} />
                <span>{c.short}: <span className="font-bold text-foreground">{val}</span></span>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

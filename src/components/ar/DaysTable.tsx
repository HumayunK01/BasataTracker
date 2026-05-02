import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatTableDate, totalForLog, type DailyLog } from "@/types/log";
import { useDeleteLog } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { Trash2, Pencil, Search, ChevronLeft, ChevronRight, BedDouble, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  logs: DailyLog[];
  onEdit: (log: DailyLog) => void;
}

const ITEMS_PER_PAGE = 15;

const CAT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(160 70% 60%)",
  "hsl(280 70% 65%)",
  "hsl(20 85% 60%)",
];

export function DaysTable({ logs, onEdit }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DailyLog | null>(null);
  const deleteLog = useDeleteLog();
  const { data: categories = [] } = useCategories();

  const getVal = (l: DailyLog, key: string): number => {
    if (key in l) return (l as Record<string, number>)[key] || 0;
    return ((l.extra as Record<string, number>) ?? {})[key] || 0;
  };

  const logTotal = (l: DailyLog) =>
    categories.reduce((s, c) => s + getVal(l, c.key), 0);

  const allSorted = useMemo(
    () => [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date)),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allSorted;
    return allSorted.filter(
      (l) =>
        l.log_date.includes(q) ||
        formatTableDate(l.log_date).toLowerCase().includes(q),
    );
  }, [allSorted, search]);

  const workingLogs = useMemo(() => filtered.filter((l) => !l.is_off_day), [filtered]);
  const avgTotal = useMemo(() => {
    if (!workingLogs.length) return 0;
    return Math.round(workingLogs.reduce((s, l) => s + categories.reduce((cs, c) => cs + getVal(l, c.key), 0), 0) / workingLogs.length);
  }, [workingLogs, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const goTo = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

  const copyLog = (l: DailyLog) => {
    const rows = l.is_off_day
      ? [["Date", formatTableDate(l.log_date)], ["Status", "Off Day"]]
      : [
          ["Date", formatTableDate(l.log_date)],
          ...categories.filter((c) => getVal(l, c.key) > 0).map((c) => [c.label, String(getVal(l, c.key))]),
          ["Total", String(logTotal(l))],
        ];

    const tdStyle = "border:1px solid #444;padding:4px 12px;text-align:left;";
    const thStyle = `${tdStyle}font-weight:600;background:#1e2130;color:#e2e8f0;`;
    const html = `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">${rows.map(([k, v]) => `<tr><td style="${thStyle}">${k}</td><td style="${tdStyle}">${v}</td></tr>`).join("")}</table>`;
    const plain = rows.map(([k, v]) => `${k}\t${v}`).join("\n");

    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]).then(() => toast.success("Copied as table"));
    } else {
      navigator.clipboard.writeText(plain).then(() => toast.success("Copied"));
    }
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }, [totalPages, page]);

  return (
    <>
      <div className="flex flex-col h-full min-h-0 gap-3">

        {/* Search + summary row */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-8 text-sm w-full"
              placeholder="Search by date or day…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span><span className="font-semibold text-foreground">{workingLogs.length}</span> working days</span>
            <span><span className="font-semibold text-foreground">{filtered.length - workingLogs.length}</span> off days</span>
            <span>Avg <span className="font-semibold text-foreground">{avgTotal}</span> docs/day</span>
          </div>
        </div>

        {/* Mobile scroll hint */}
        <p className="text-xs text-muted-foreground/50 text-center sm:hidden shrink-0">← scroll →</p>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto no-scrollbar" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-[120px] font-medium text-xs">Date</TableHead>
                  {categories.map((c, i) => (
                    <TableHead key={c.key} className="font-medium text-xs text-center w-[72px]">
                      <span style={{ color: CAT_COLORS[i] }}>{c.short}</span>
                    </TableHead>
                  ))}
                  <TableHead className="font-medium text-xs text-center w-[72px]">Total</TableHead>
                  <TableHead className="w-[72px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={categories.length + 3} className="text-center text-muted-foreground py-16 text-sm">
                      {search ? "No entries match your search." : "No days logged yet."}
                    </TableCell>
                  </TableRow>
                )}
                {paginated.map((l) => {
                  const total = logTotal(l);
                  return l.is_off_day ? (
                    <TableRow key={l.id} className="group border-b border-border/50 last:border-0 bg-muted/20">
                      <TableCell className="tabular-nums text-sm font-medium py-2.5 text-muted-foreground">
                        {formatTableDate(l.log_date)}
                      </TableCell>
                      <TableCell colSpan={categories.length + 1} className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Off Day</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => copyLog(l)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(l)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(l)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={l.id} className="group border-b border-border/50 last:border-0">
                      <TableCell className="tabular-nums text-sm font-medium py-2.5">
                        {formatTableDate(l.log_date)}
                      </TableCell>
                      {categories.map((c, i) => {
                        const v = getVal(l, c.key);
                        return (
                          <TableCell key={c.key} className="text-center tabular-nums text-sm py-2.5">
                            {v > 0 ? (
                              <span className="font-medium" style={{ color: CAT_COLORS[i] }}>{v}</span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center tabular-nums py-2.5">
                        <span className="font-bold text-sm">{total}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => copyLog(l)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(l)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(l)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="shrink-0 border-t border-border px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(page - 1)} disabled={page === 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {pageNumbers.map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "ghost"}
                      size="icon"
                      className="h-7 w-7 text-xs"
                      onClick={() => goTo(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(page + 1)} disabled={page === totalPages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log?</AlertDialogTitle>
            <AlertDialogDescription>
              The log for <strong>{deleteTarget ? formatTableDate(deleteTarget.log_date) : ""}</strong> will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) { deleteLog.mutate(deleteTarget.id); setDeleteTarget(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

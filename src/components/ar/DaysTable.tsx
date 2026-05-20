import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { colorForKey } from "@/lib/cat-colors";
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
import { formatTableDate, isWeekend, totalForLog, type DailyLog } from "@/types/log";
import { useDeleteLog } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { Trash2, Pencil, Search, ChevronLeft, ChevronRight, BedDouble, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface PaginationProps {
  page: number;
  totalPages: number;
  pageNumbers: (number | "…")[];
  itemsPerPage: number;
  goTo: (p: number) => void;
  onItemsPerPageChange: (n: number) => void;
}

function Pagination({ page, totalPages, pageNumbers, itemsPerPage, goTo, onItemsPerPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="shrink-0 py-2.5 flex items-center relative">
      <div className="flex items-center gap-1 mx-auto">
        <Button size="sm" className="h-8 px-3 text-sm rounded-md bg-sidebar border border-border text-foreground hover:bg-muted" onClick={() => goTo(1)} disabled={page === 1}>First</Button>
        <Button size="icon" className="size-8 rounded-md bg-sidebar border border-border text-foreground hover:bg-muted" onClick={() => goTo(page - 1)} disabled={page === 1}>
          <ChevronLeft className="size-4" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="w-8 text-center text-sm text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              size="icon"
              className={`size-8 text-sm rounded-md border border-border ${page === p ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-sidebar text-foreground hover:bg-muted"}`}
              onClick={() => goTo(p as number)}
            >
              {p}
            </Button>
          ),
        )}
        <Button size="icon" className="size-8 rounded-md bg-sidebar border border-border text-foreground hover:bg-muted" onClick={() => goTo(page + 1)} disabled={page === totalPages}>
          <ChevronRight className="size-4" />
        </Button>
        <Button size="sm" className="h-8 px-3 text-sm rounded-md bg-sidebar border border-border text-foreground hover:bg-muted" onClick={() => goTo(totalPages)} disabled={page === totalPages}>Last</Button>
      </div>
      <div className="absolute right-0 flex items-center gap-2 text-sm text-muted-foreground">
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
    </div>
  );
}

interface Props {
  logs: DailyLog[];
  onEdit: (log: DailyLog) => void;
}

export function DaysTable({ logs, onEdit }: Props) {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DailyLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const deleteLog = useDeleteLog();
  const { data: categories = [] } = useCategories();

  const getVal = (l: DailyLog, key: string): number => (l.counts ?? {})[key] ?? 0;
  const logTotal = (l: DailyLog) => categories.reduce((s, c) => s + getVal(l, c.key), 0);

  const allSorted = useMemo(
    () => logs.toSorted((a, b) => b.log_date.localeCompare(a.log_date)),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allSorted;
    return allSorted.filter(
      (l) => l.log_date.includes(q) || formatTableDate(l.log_date).toLowerCase().includes(q),
    );
  }, [allSorted, search]);

  const workingLogs = useMemo(() => filtered.filter((l) => !l.is_off_day), [filtered]);
  const avgTotal = useMemo(() => {
    if (!workingLogs.length) return 0;
    return Math.round(
      workingLogs.reduce((s, l) => s + categories.reduce((cs, c) => cs + getVal(l, c.key), 0), 0) /
        workingLogs.length,
    );
  }, [workingLogs, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const goTo = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

  const copyLog = (l: DailyLog) => {
    const rows = l.is_off_day
      ? [["Date", formatTableDate(l.log_date)], ["Status", isWeekend(l.log_date) ? "Weekend" : "Off Day"]]
      : [
          ["Date", formatTableDate(l.log_date)],
          ...categories.reduce<string[][]>((acc, c) => { if (getVal(l, c.key) > 0) acc.push([c.label, String(getVal(l, c.key))]); return acc; }, []),
        ];

    const tdStyle = "border:1px solid #444;padding:4px 12px;text-align:left;";
    const thStyle = `${tdStyle}font-weight:600;background:#1e2130;color:#e2e8f0;`;
    const html = `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">${rows.map(([k, v]) => `<tr><td style="${thStyle}">${k}</td><td style="${tdStyle}">${v}</td></tr>`).join("")}</table>`;
    const plain = rows.map(([k, v]) => `${k}\t${v}`).join("\n");

    const onCopied = () => {
      setCopiedId(l.id);
      setTimeout(() => setCopiedId(null), 1500);
    };

    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard
        .write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ])
        .then(onCopied);
    } else {
      navigator.clipboard.writeText(plain).then(onCopied);
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
      <div className="flex flex-col h-full min-h-0 gap-3 font-[system-ui]">

        {/* Search + summary */}
        <div className="flex items-center gap-3 shrink-0 px-0">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-10 text-sm w-full bg-card border-border"
              placeholder="Search by date…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
            <span><span className="font-semibold text-foreground">{workingLogs.length}</span> working days</span>
            <span><span className="font-semibold text-foreground">{filtered.filter((l) => l.is_off_day && isWeekend(l.log_date)).length}</span> weekends</span>
            <span><span className="font-semibold text-foreground">{filtered.filter((l) => l.is_off_day && !isWeekend(l.log_date)).length}</span> off days</span>
            <span>Avg <span className="font-semibold text-foreground">{avgTotal}</span> docs/day</span>
          </div>
        </div>

        {/* ── MOBILE card list (hidden sm+) ── */}
        <div className="flex flex-col flex-1 min-h-0 sm:hidden bg-card border border-border rounded-md overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/50 min-h-0">
            {paginated.length === 0 && (
              <p className="text-center text-muted-foreground py-16 text-sm">
                {search ? "No entries match your search." : "No days logged yet."}
              </p>
            )}
            {paginated.map((l) => {
              const isOff = l.is_off_day;
              const weekend = isWeekend(l.log_date);
              const total = logTotal(l);
              const activeCats = categories.filter((c) => getVal(l, c.key) > 0);

              if (isOff) {
                return (
                  <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 bg-muted/20">
                    <BedDouble className="size-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-sm text-muted-foreground tabular-nums flex-1">
                      {formatTableDate(l.log_date)}
                    </span>
                    <span className="text-xs text-muted-foreground/60 uppercase tracking-wide font-medium">
                      {weekend ? "Weekend" : "Off day"}
                    </span>
                    <div className="flex items-center gap-0.5 ml-1">
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground/40 hover:text-foreground" onClick={() => onEdit(l)}>
                        <Pencil className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground/40 hover:text-destructive" onClick={() => setDeleteTarget(l)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={l.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums flex-1">{formatTableDate(l.log_date)}</span>
                    <span className="text-2xl font-black tabular-nums text-primary leading-none">{total}</span>
                    <div className="flex items-center gap-0.5 ml-1">
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground/50 hover:text-foreground" onClick={() => copyLog(l)}>
                        <Copy className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground/50 hover:text-foreground" onClick={() => onEdit(l)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground/50 hover:text-destructive" onClick={() => setDeleteTarget(l)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {activeCats.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeCats.map((c) => {
                        const clr = colorForKey(c.key);
                        return (
                          <span
                            key={c.key}
                            className="text-xs font-medium px-2 py-0.5 rounded-full tabular-nums"
                            style={{ color: clr, backgroundColor: `${clr}20`, border: `1px solid ${clr}33` }}
                          >
                            {c.short} · {getVal(l, c.key)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DESKTOP table (hidden below sm) ── */}
        <div className="hidden sm:flex flex-col bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-auto no-scrollbar">
            <Table className="[&_th]:border-r [&_th]:border-border [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border bg-muted/40">
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-foreground text-center py-3">Date</TableHead>
                  {categories.map((c) => (
                    <TableHead key={c.key} className="font-bold text-xs uppercase tracking-wider text-center text-foreground">
                      {c.short}
                    </TableHead>
                  ))}
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-center text-foreground">Total</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-foreground text-center">Actions</TableHead>
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
                    <TableRow key={l.id} className="border-b border-border/40 last:border-0 bg-muted/10">
                      <TableCell className="tabular-nums text-sm font-medium py-3 text-muted-foreground text-center">
                        {formatTableDate(l.log_date)}
                      </TableCell>
                      <TableCell colSpan={categories.length + 1} className="py-3">
                        <div className="flex items-center gap-1.5">
                          <BedDouble className="size-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                            {isWeekend(l.log_date) ? "Weekend" : "Off Day"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" className="size-7 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => copyLog(l)} title="Copy">
                            {copiedId === l.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          </Button>
                          <Button variant="secondary" size="icon" className="size-7" onClick={() => onEdit(l)} title="Edit">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="secondary" size="icon" className="size-7 hover:bg-destructive/20 hover:text-destructive" onClick={() => setDeleteTarget(l)} title="Delete">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={l.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                      <TableCell className="tabular-nums text-sm font-medium py-3 text-foreground text-center">
                        {formatTableDate(l.log_date)}
                      </TableCell>
                      {categories.map((c) => {
                        const v = getVal(l, c.key);
                        return (
                          <TableCell key={c.key} className="text-center tabular-nums text-sm py-3">
                            {v > 0 ? (
                              <span className="font-medium text-foreground">{v}</span>
                            ) : (
                              <span className="text-muted-foreground/30" aria-hidden="true">{"—"}</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center tabular-nums py-3">
                        <span className="font-bold text-sm text-foreground">{total}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" className="size-7 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => copyLog(l)} title="Copy">
                            {copiedId === l.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          </Button>
                          <Button variant="secondary" size="icon" className="size-7" onClick={() => onEdit(l)} title="Edit">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="secondary" size="icon" className="size-7 hover:bg-destructive/20 hover:text-destructive" onClick={() => setDeleteTarget(l)} title="Delete">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          itemsPerPage={itemsPerPage}
          goTo={goTo}
          onItemsPerPageChange={(n) => { setItemsPerPage(n); setPage(1); }}
        />

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
              onClick={() => {
                if (deleteTarget) {
                  deleteLog.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

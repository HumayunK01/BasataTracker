import { useMemo, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { pageNumbersArr as sharedPageNumbers } from "@/components/ar/tracker/tracker-helpers";
import { Pagination } from "@/components/Pagination";
import { formatTableDate, formatDayName, isWeekend, type DailyLog } from "@/types/log";
import { useDeleteLog } from "@/hooks/useDailyLogs";
import { useCategories, type Category } from "@/hooks/useCategories";
import { colorForKey } from "@/lib/cat-colors";
import { Trash2, Pencil, Search, BedDouble, Copy, Check, CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ar/industrial";

// ── Helpers ────────────────────────────────────────────────────────────────
function getVal(l: DailyLog, key: string): number { return (l.counts ?? {})[key] ?? 0; }

function DateDay({ iso, isOff }: { iso: string; isOff?: boolean }) {
  return (
    <span className={`tabular-nums font-normal ${isOff ? "text-muted-foreground/60" : "text-foreground"}`}>
      {formatTableDate(iso)}
    </span>
  );
}

// ── Table (all screen sizes — scrolls horizontally on mobile) ─────────────
interface DesktopTableProps {
  paginated: DailyLog[];
  categories: Category[];
  search: string;
  copiedId: string | null;
  onEdit: (l: DailyLog) => void;
  onDelete: (l: DailyLog) => void;
  onCopy: (l: DailyLog) => void;
}

function DesktopTable({ paginated, categories, search, copiedId, onEdit, onDelete, onCopy }: DesktopTableProps) {
  const thCls = "relative z-10 font-bold text-xs uppercase tracking-wider text-white text-center py-2 sm:py-2.5 px-2 sm:px-3 font-hubot whitespace-nowrap";
  const Sep = () => <span className="theme-header-sep absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-px bg-border pointer-events-none" aria-hidden="true" />;
  const BottomLine = () => <span className="theme-header-bottom-line absolute bottom-0 left-0 right-0 h-px bg-white pointer-events-none z-10" aria-hidden="true" />;

  const colTotals = useMemo(
    () =>
      Object.fromEntries(
        categories.map((c) => [
          c.key,
          paginated.reduce((s, l) => s + (l.is_off_day ? 0 : getVal(l, c.key)), 0),
        ]),
      ) as Record<string, number>,
    [paginated, categories],
  );
  const grandTotal = useMemo(() => Object.values(colTotals).reduce((a, b) => a + b, 0), [colTotals]);

  return (
    <div className="flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <Table className="min-w-[600px] [&_tbody_tr]:border-0">
          <TableHeader className="relative z-10">
            <TableRow className="hover:bg-transparent bg-muted/40 relative z-10">
              <TableHead className={thCls}>
                <span className="block truncate">Date</span>
                <Sep />
                <BottomLine />
              </TableHead>
              {categories.map((c) => (
                <TableHead key={c.key} title={c.label} className={thCls}>
                  <span className="block truncate">{c.short}</span>
                  <Sep />
                  <BottomLine />
                </TableHead>
              ))}
              <TableHead className={thCls}>
                <span className="block truncate">Total</span>
                <Sep />
                <BottomLine />
              </TableHead>
              <TableHead className={`${thCls} w-32`}>
                <span className="block truncate">Actions</span>
                <BottomLine />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={categories.length + 3} className="text-center">
                  <EmptyState
                    className="py-12"
                    icon={CalendarDays}
                    title={search ? "No Matches" : "No Days Yet"}
                    hint={search ? "Nothing matches your search." : "Log a day to start your history."}
                  />
                </TableCell>
              </TableRow>
            )}
            {paginated.map((l, idx) => {
              const total = categories.reduce((s, c) => s + getVal(l, c.key), 0);
              const isOff = l.is_off_day;
              const weekend = isWeekend(l.log_date);

              return isOff ? (
                <TableRow key={l.id} className="border-0 bg-muted/20 hover:bg-muted/25 transition-colors animate-row-in" style={{ animationDelay: `${idx * 20}ms` }}>
                  <TableCell className="text-xs font-normal py-2 sm:py-2.5 text-center">
                    <DateDay iso={l.log_date} isOff />
                  </TableCell>
                  <TableCell colSpan={categories.length + 1} className="py-2 sm:py-2.5">
                    <div className="flex items-center gap-2">
                      <BedDouble className="size-3.5 text-muted-foreground/50 shrink-0" />
                      <span className="text-xs font-normal text-muted-foreground/60 tracking-wide uppercase shrink-0">
                        {weekend ? "Weekend" : "Off Day"}
                      </span>
                      {l.notes && (
                        <span className="text-xs text-muted-foreground/80 italic font-normal truncate max-w-md" title={l.notes}>
                          &ldquo;{l.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 sm:py-2.5">
                    <div className="flex gap-1 justify-center">
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-success hover:bg-success/10" onClick={() => onCopy(l)} title="Copy">
                        {copiedId === l.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => onEdit(l)} title="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(l)} title="Delete">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={l.id} title={l.notes ?? undefined} className="border-0 bg-card hover:bg-muted/30 transition-colors animate-row-in" style={{ animationDelay: `${idx * 20}ms` }}>
                  <TableCell className="text-xs font-normal py-2 sm:py-2.5 text-center">
                    <DateDay iso={l.log_date} />
                  </TableCell>
                  {categories.map((c) => {
                    const v = getVal(l, c.key);
                    return (
                      <TableCell key={c.key} className="text-center tabular-nums text-xs py-2 sm:py-2.5">
                        {v > 0 ? (
                          <span className="font-normal text-foreground">{v}</span>
                        ) : (
                          <span className="text-muted-foreground/40" aria-hidden="true">{"—"}</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center tabular-nums py-2 sm:py-2.5">
                    <span className="font-normal text-xs text-foreground">{total}</span>
                  </TableCell>
                  <TableCell className="py-2 sm:py-2.5">
                    <div className="flex gap-1 justify-center">
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-success hover:bg-success/10" onClick={() => onCopy(l)} title="Copy">
                        {copiedId === l.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => onEdit(l)} title="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(l)} title="Delete">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {paginated.length > 0 && (
            <TableFooter className="hidden [html[data-theme-variant=classic]_&]:table-footer-group">
              <TableRow className="bg-muted/40 hover:bg-transparent border-t border-border">
                <TableHead className="font-mono text-2xs uppercase tracking-wider text-muted-foreground text-center py-2.5">Σ Page</TableHead>
                {categories.map((c) => (
                  <TableHead key={c.key} className="text-center tabular-nums text-xs font-bold" style={{ color: colorForKey(c.key) }}>
                    {colTotals[c.key] || <span className="text-muted-foreground/30">—</span>}
                  </TableHead>
                ))}
                <TableHead className="text-center tabular-nums text-xs font-bold text-foreground">{grandTotal}</TableHead>
                <TableHead aria-hidden />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

// ── Reducer ────────────────────────────────────────────────────────────────
interface TableState { page: number; itemsPerPage: number; search: string; deleteTarget: DailyLog | null; copiedId: string | null; }
type TableAction =
  | { type: "set_page"; p: number }
  | { type: "set_per_page"; n: number }
  | { type: "set_search"; q: string }
  | { type: "set_delete"; log: DailyLog | null }
  | { type: "set_copied"; id: string | null };

const tableInit: TableState = { page: 1, itemsPerPage: 10, search: "", deleteTarget: null, copiedId: null };

function tableReducer(s: TableState, a: TableAction): TableState {
  switch (a.type) {
    case "set_page": return { ...s, page: a.p };
    case "set_per_page": return { ...s, itemsPerPage: a.n, page: 1 };
    case "set_search": return { ...s, search: a.q, page: 1 };
    case "set_delete": return { ...s, deleteTarget: a.log };
    case "set_copied": return { ...s, copiedId: a.id };
    default: return s;
  }
}

// ── Main component ─────────────────────────────────────────────────────────
interface Props {
  logs: DailyLog[];
  onEdit: (log: DailyLog) => void;
  actions?: React.ReactNode;
}

export function DaysTable({ logs, onEdit, actions }: Props) {
  const [{ page, itemsPerPage, search, deleteTarget, copiedId }, tDispatch] = useReducer(tableReducer, tableInit);
  const deleteLog = useDeleteLog();
  const { data: categories = [] } = useCategories();

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
        formatTableDate(l.log_date).toLowerCase().includes(q) ||
        formatDayName(l.log_date).toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q),
    );
  }, [allSorted, search]);

  const workingLogs = useMemo(() => filtered.filter((l) => !l.is_off_day), [filtered]);
  const avgTotal = useMemo(() => {
    if (!workingLogs.length) return 0;
    return Math.round(
      workingLogs.reduce((s, l) => s + categories.reduce((cs, c) => cs + getVal(l, c.key), 0), 0) /
        workingLogs.length,
    );
  }, [workingLogs, categories]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const goTo = (p: number) => tDispatch({ type: "set_page", p: Math.max(1, Math.min(totalPages, p)) });

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
      tDispatch({ type: "set_copied", id: l.id });
      setTimeout(() => tDispatch({ type: "set_copied", id: null }), 1500);
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

  const pageNumbers = useMemo(() => sharedPageNumbers(totalPages, page), [totalPages, page]);

  const sharedProps = { paginated, categories, search, copiedId, onEdit, onDelete: (l: DailyLog) => tDispatch({ type: "set_delete", log: l }), onCopy: copyLog };

  return (
    <>
      <div className="flex flex-col min-h-0 gap-3">

        {/* Search + summary + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground pointer-events-none" />
            <Input
              className="pl-9 h-10 text-sm w-full bg-card border-border"
              placeholder="Search date, day, or notes…"
              aria-label="Search days by date, day name, or notes"
              value={search}
              onChange={(e) => tDispatch({ type: "set_search", q: e.target.value })}
            />
          </div>
            <div className="flex items-center gap-3 sm:ml-auto">
            <div className="hidden sm:flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-foreground">
              <span><span className="font-semibold text-foreground">{workingLogs.length}</span> working days</span>
              <span><span className="font-semibold text-foreground">{filtered.filter((l) => l.is_off_day && isWeekend(l.log_date)).length}</span> weekends</span>
              <span><span className="font-semibold text-foreground">{filtered.filter((l) => l.is_off_day && !isWeekend(l.log_date)).length}</span> off days</span>
              <span>Avg <span className="font-semibold text-foreground">{avgTotal}</span> docs/day</span>
            </div>
            {actions && <div className="flex w-full items-center gap-2 sm:w-auto">{actions}</div>}
          </div>
        </div>

        <DesktopTable {...sharedProps} />

        <Pagination
          page={page}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          onPageChange={goTo}
          showFirstLast
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(n) => tDispatch({ type: "set_per_page", n })}
        />

      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && tDispatch({ type: "set_delete", log: null })}>
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
                  tDispatch({ type: "set_delete", log: null });
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

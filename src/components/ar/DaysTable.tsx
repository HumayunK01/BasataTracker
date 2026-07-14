import { useMemo, useReducer } from "react";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
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
import { pageNumbersArr as sharedPageNumbers } from "@/components/ar/tracker/tracker-helpers";
import { Pagination } from "@/components/Pagination";
import { formatTableDate, isWeekend, type DailyLog } from "@/types/log";
import { useDeleteLog } from "@/hooks/useDailyLogs";
import { useCategories, type Category } from "@/hooks/useCategories";
import { Trash2, Pencil, Search, BedDouble, Copy, Check, CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ar/industrial";

// ── Helpers ────────────────────────────────────────────────────────────────
function getVal(l: DailyLog, key: string): number { return (l.counts ?? {})[key] ?? 0; }



// ── Mobile card list ───────────────────────────────────────────────────────
interface MobileCardListProps {
  paginated: DailyLog[];
  categories: Category[];
  search: string;
  copiedId: string | null;
  onEdit: (l: DailyLog) => void;
  onDelete: (l: DailyLog) => void;
  onCopy: (l: DailyLog) => void;
}

function MobileCardList({ paginated, categories, search, copiedId, onEdit, onDelete, onCopy }: MobileCardListProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 sm:hidden bg-card border border-border rounded-md overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/50 min-h-0">
        {paginated.length === 0 && (
          <EmptyState
            className="py-12"
            icon={CalendarDays}
            title={search ? "No Matches" : "No Days Yet"}
            hint={search ? "Nothing matches your search." : "Log a day to start your history."}
          />
        )}
        {paginated.map((l) => {
          const isOff = l.is_off_day;
          const weekend = isWeekend(l.log_date);
          const total = categories.reduce((s, c) => s + getVal(l, c.key), 0);
          const activeCats = categories.filter((c) => getVal(l, c.key) > 0);

          if (isOff) {
            return (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 bg-muted/20">
                <BedDouble className="size-3.5 text-muted-foreground/50 shrink-0" />
                <span className="text-sm text-muted-foreground tabular-nums flex-1">
                  {formatTableDate(l.log_date)}
                </span>
                <span className="text-xs text-muted-foreground/60 uppercase tracking-wide font-medium font-heading">
                  {weekend ? "Weekend" : "Off day"}
                </span>
                <div className="flex items-center gap-0.5 ml-1">
                  <Button variant="ghost" size="icon" className="size-9 text-muted-foreground/40 hover:text-foreground" onClick={() => onEdit(l)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9 text-muted-foreground/40 hover:text-destructive" onClick={() => onDelete(l)}>
                    <Trash2 className="size-4" />
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
                  <Button variant="ghost" size="icon" className="size-9 text-muted-foreground/50 hover:text-foreground" onClick={() => onCopy(l)}>
                    {copiedId === l.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9 text-muted-foreground/50 hover:text-foreground" onClick={() => onEdit(l)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9 text-muted-foreground/50 hover:text-destructive" onClick={() => onDelete(l)}>
                    <Trash2 className="size-4" />
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
                        style={{ color: clr, backgroundColor: withAlpha(clr, 0.13), border: `1px solid ${withAlpha(clr, 0.2)}` }}
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
  );
}

// ── Desktop table ──────────────────────────────────────────────────────────
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
  return (
    <div className="hidden sm:flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="overflow-auto no-scrollbar">
        <Table className="[&_th]:border-r [&_th]:border-border [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-border/40 [&_td:last-child]:border-r-0">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border bg-muted/40">
              <TableHead className="font-bold text-xs uppercase tracking-wider text-foreground text-center py-3 font-heading">Date</TableHead>
              {categories.map((c) => (
                <TableHead key={c.key} className="font-bold text-xs uppercase tracking-wider text-center text-foreground font-heading">
                  {c.short}
                </TableHead>
              ))}
              <TableHead className="font-bold text-xs uppercase tracking-wider text-center text-foreground font-heading">Total</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-foreground text-center font-heading">Actions</TableHead>
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
            {paginated.map((l) => {
              const total = categories.reduce((s, c) => s + getVal(l, c.key), 0);
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
                      <Button size="icon" className="size-7 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onCopy(l)} title="Copy">
                        {copiedId === l.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </Button>
                      <Button variant="secondary" size="icon" className="size-7" onClick={() => onEdit(l)} title="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="secondary" size="icon" className="size-7 hover:bg-destructive/20 hover:text-destructive" onClick={() => onDelete(l)} title="Delete">
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
                      <Button size="icon" className="size-7 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onCopy(l)} title="Copy">
                        {copiedId === l.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </Button>
                      <Button variant="secondary" size="icon" className="size-7" onClick={() => onEdit(l)} title="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="secondary" size="icon" className="size-7 hover:bg-destructive/20 hover:text-destructive" onClick={() => onDelete(l)} title="Delete">
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
}

export function DaysTable({ logs, onEdit }: Props) {
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
      <div className="flex flex-col h-full min-h-0 gap-4">

        {/* Search + summary */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-10 text-sm w-full bg-card border-border"
              placeholder="Search by date…"
              value={search}
              onChange={(e) => tDispatch({ type: "set_search", q: e.target.value })}
            />
          </div>
          <div className="sm:ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span><span className="font-semibold text-foreground">{workingLogs.length}</span> working days</span>
            <span><span className="font-semibold text-foreground">{filtered.filter((l) => l.is_off_day && isWeekend(l.log_date)).length}</span> weekends</span>
            <span><span className="font-semibold text-foreground">{filtered.filter((l) => l.is_off_day && !isWeekend(l.log_date)).length}</span> off days</span>
            <span>Avg <span className="font-semibold text-foreground">{avgTotal}</span> docs/day</span>
          </div>
        </div>

        <MobileCardList {...sharedProps} />
        {categories.length > 6 && (
          <p className="hidden sm:block text-center text-2xs text-muted-foreground/40 -mt-2 select-none">← scroll horizontally →</p>
        )}
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

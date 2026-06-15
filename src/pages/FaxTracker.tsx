import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  useFaxTracker,
  useDeleteFax,
  type FaxRow,
  type FaxStepStatus,
} from "@/hooks/useFaxTracker";
import { downloadFaxPDF } from "@/lib/fax-utils";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { PageHeader } from "@/components/ar/PageHeader";
import { FaxEntryDialog } from "@/components/ar/fax/FaxEntryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Search, ListFilter, FileWarning, MoreVertical, FileText, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

async function copyName(name: string) {
  try {
    await navigator.clipboard.writeText(name);
    toast.success(`Copied "${name}"`);
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}

// ── Status → color classes ──────────────────────────────────────────────────
// Spreadsheet style: bold colored text (no badge boxes) on a tinted row.
function stepClasses(status: FaxStepStatus | null): string {
  switch (status) {
    case "Successfully Sent": return "text-emerald-700 dark:text-emerald-300";
    case "Failed":            return "text-rose-700 dark:text-rose-300";
    case "Waiting":           return "text-amber-600 dark:text-amber-300";
    case "Pending":           return "text-muted-foreground";
    default:                  return "text-muted-foreground/40";
  }
}

function overallClasses(status: string): string {
  if (status.startsWith("Resolved"))    return "text-emerald-700 dark:text-emerald-300";
  if (status === "All Steps Failed")    return "text-rose-700 dark:text-rose-300";
  if (status.startsWith("Waiting"))     return "text-amber-700 dark:text-amber-300";
  if (status.startsWith("Move to"))     return "text-amber-600 dark:text-amber-300";
  return "text-muted-foreground";
}

// The DB's auto-computed overall_status carries a trailing "#" (e.g.
// "Resolved – Refax Same #"). Strip it for display only; the raw value is kept
// for filtering/color logic so it still matches what the database stores.
function displayStatus(status: string): string {
  return status.replace(/\s*#\s*$/, "").trim();
}

// High-level filter groups. Each maps to one or more raw overall_status values.
const STATUS_GROUPS = ["Resolved", "Failed", "Waiting", "Incomplete"] as const;
type StatusGroup = (typeof STATUS_GROUPS)[number];

type SortKey = "patient_name" | "overall_status";

function statusGroup(status: string): StatusGroup | null {
  if (status.startsWith("Resolved")) return "Resolved";
  if (status === "All Steps Failed") return "Failed";
  if (status.startsWith("Waiting")) return "Waiting";
  // A step failed but the next hasn't been attempted yet — work still pending.
  if (status.startsWith("Move to") || status === "Pending") return "Incomplete";
  return null;
}

// Whole-row tint: green for resolved, red for all-steps-failed (like the sheet).
function rowClasses(status: string): string {
  switch (statusGroup(status)) {
    case "Resolved": return "bg-emerald-500/[0.18] hover:bg-emerald-500/25 dark:bg-emerald-500/[0.08] dark:hover:bg-emerald-500/[0.14]";
    case "Failed":   return "bg-rose-500/[0.18] hover:bg-rose-500/25 dark:bg-rose-500/[0.08] dark:hover:bg-rose-500/[0.14]";
    case "Waiting":  return "bg-amber-400/[0.18] hover:bg-amber-400/25 dark:bg-amber-400/[0.08] dark:hover:bg-amber-400/[0.14]";
    case "Incomplete": return "bg-slate-400/[0.14] hover:bg-slate-400/20 dark:bg-slate-400/[0.07] dark:hover:bg-slate-400/[0.12]";
    default:         return "hover:bg-muted/30";
  }
}

function StepCell({ status }: { status: FaxStepStatus | null }) {
  if (!status) return <td className="px-3 py-2 text-center text-muted-foreground/40">—</td>;
  return (
    <td className={cn("px-3 py-2 text-center text-sm font-semibold", stepClasses(status))}>
      {status}
    </td>
  );
}

const STEP_LABELS = ["Step 1 – Refax Same", "Step 2 – Refax New", "Step 3 – Reupload ROI"];

// Stacked card used on phones, where the 7-column table needs scrolling.
function FaxCard({
  row,
  mine,
  isNew,
  onEdit,
  onDelete,
}: {
  row: FaxRow;
  mine: boolean;
  isNew: boolean;
  onEdit: (row: FaxRow) => void;
  onDelete: (row: FaxRow) => void;
}) {
  const steps = [row.step1, row.step2, row.step3];
  return (
    <div
      className={cn(
        "rounded-lg border border-border p-3.5 transition-colors",
        rowClasses(row.overall_status),
        isNew && "animate-row-in",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => copyName(row.patient_name)}
          title="Tap to copy name"
          className="press-scale font-semibold text-base text-foreground rounded px-1 -mx-1 text-left active:bg-foreground/10 transition-colors"
        >
          {row.patient_name}
        </button>
        {mine ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 -mr-1.5 -mt-1 shrink-0">
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 font-[system-ui]">
              <button
                className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent rounded-sm"
                onClick={() => onEdit(row)}
              >
                <Pencil className="size-4" /> Edit
              </button>
              <button
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-sm"
                onClick={() => onDelete(row)}
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Overall status badge */}
      <div className={cn("mt-1 text-sm font-semibold", overallClasses(row.overall_status))}>
        {displayStatus(row.overall_status)}
      </div>

      {/* Steps */}
      <dl className="mt-3 space-y-1.5">
        {steps.map((status, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{STEP_LABELS[i]}</dt>
            <dd className={cn("font-semibold text-right", status ? stepClasses(status) : "text-muted-foreground/40")}>
              {status ?? "—"}
            </dd>
          </div>
        ))}
      </dl>

      {row.notes && (
        <p className="mt-3 pt-3 border-t border-border/60 text-sm text-muted-foreground leading-snug">
          {row.notes}
        </p>
      )}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (key: SortKey) => void;
  align: "left" | "center";
}) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "press-scale inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wide",
        align === "center" ? "mx-auto" : "",
        active && "text-foreground",
      )}
      title={`Sort by ${label.toLowerCase()}`}
    >
      {label}
      {/* Icon swaps direction on sort change — a quick scale-in masks the swap. */}
      <Icon key={active ? sort.dir : "idle"} className={cn("size-3 animate-fade-in", active ? "opacity-100" : "opacity-40")} />
    </button>
  );
}

const FaxTrackerPage = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: rows = [], isLoading } = useFaxTracker();
  const deleteFax = useDeleteFax();
  const [exporting, setExporting] = useState(false);

  const [now] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaxRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaxRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rowsFiltered = rows.filter((r) => {
      if (statusFilter.size) {
        const group = statusGroup(r.overall_status);
        if (!group || !statusFilter.has(group)) return false;
      }
      if (q && !r.patient_name.toLowerCase().includes(q) && !(r.notes ?? "").toLowerCase().includes(q)) return false;
      return true;
    });

    // No sort → keep insert order (the query's ascending created_at).
    if (!sort) return rowsFiltered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rowsFiltered].sort((a, b) => {
      const av = sort.key === "patient_name" ? a.patient_name : displayStatus(a.overall_status);
      const bv = sort.key === "patient_name" ? b.patient_name : displayStatus(b.overall_status);
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
    });
  }, [rows, search, statusFilter, sort]);

  // Track which row IDs are new since the last render so we can animate just
  // those in (not the whole table on every refetch). Skips the first load.
  const seenIds = useRef<Set<string> | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(rows.map((r) => r.id));
    if (seenIds.current === null) {
      seenIds.current = current; // first load: no entrance animation
      return;
    }
    const added = [...current].filter((id) => !seenIds.current!.has(id));
    seenIds.current = current;
    if (added.length === 0) return;
    setNewIds(new Set(added));
    // Clear the flag once the animation has played so re-renders don't replay it.
    const t = setTimeout(() => setNewIds(new Set()), 400);
    return () => clearTimeout(t);
  }, [rows]);

  // Counts per filter group (over all rows) — shown in the filter dropdown.
  const groupCounts = useMemo(() => {
    const counts: Record<StatusGroup, number> = { Resolved: 0, Failed: 0, Waiting: 0, Incomplete: 0 };
    for (const r of rows) {
      const g = statusGroup(r.overall_status);
      if (g) counts[g]++;
    }
    return counts;
  }, [rows]);

  // Summary counts (over all rows, matching the spreadsheet header).
  const stats = useMemo(
    () => ({
      resolved: groupCounts.Resolved,
      allFailed: groupCounts.Failed,
      waiting: groupCounts.Waiting,
      total: rows.length,
    }),
    [groupCounts, rows.length],
  );

  const hasActiveFilters = search.trim() !== "" || statusFilter.size > 0;
  const clearAll = () => { setSearch(""); setStatusFilter(new Set()); };

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; // third click clears the sort
    });
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: FaxRow) => { setEditing(row); setDialogOpen(true); };

  // Export whatever is currently on screen (filters + search applied).
  const handleExport = async () => {
    setExporting(true);
    try {
      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined;
      const activeFilters = statusFilter.size ? Array.from(statusFilter).join(", ") : null;
      const subtitleBits = [
        activeFilters ? `Status: ${activeFilters}` : "All patients",
        search.trim() ? `Search: "${search.trim()}"` : null,
      ].filter(Boolean);

      // Build a filename that reflects the active filter, e.g.
      // fax-tracker-failed-2026-06-15.pdf  /  fax-tracker-resolved-waiting-...
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const statusPart = statusFilter.size
        ? STATUS_GROUPS.filter((g) => statusFilter.has(g)).map(slug).join("-")
        : "all";
      const searchPart = search.trim() ? `-${slug(search.trim())}` : "";
      const datePart = new Date().toISOString().slice(0, 10);
      const filename = `fax-tracker-${statusPart}${searchPart}-${datePart}.pdf`;

      await downloadFaxPDF(filtered, filename, {
        userName,
        subtitle: subtitleBits.join("  ·  "),
      });
    } finally {
      setExporting(false);
    }
  };

  const toggleStatus = (s: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  return (
    <>
      <PageHeader
        now={now}
        subtitle="Fax Tracker"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              title={filtered.length === 0 ? "Nothing to export" : "Export the current view to PDF"}
            >
              <FileText className="size-4 mr-1" />
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
            <Button size="sm" className="h-8 shrink-0 bg-primary hover:bg-primary/95 text-primary-foreground" onClick={openAdd}>
              <Plus className="size-4 mr-1" /> Add Patient
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="w-full space-y-4">

          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Resolved" value={stats.resolved} tone="emerald" loading={isLoading} />
            <StatCard label="All Steps Failed" value={stats.allFailed} tone="rose" loading={isLoading} />
            <StatCard label="Waiting" value={stats.waiting} tone="sky" loading={isLoading} />
            <StatCard label="Total Patients" value={stats.total} tone="neutral" loading={isLoading} />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search patient or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 shrink-0">
                  <ListFilter className="size-4 mr-1.5" />
                  Status{statusFilter.size ? ` (${statusFilter.size})` : ""}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-[system-ui]">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Filter by overall status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STATUS_GROUPS.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={statusFilter.has(s)}
                    onCheckedChange={() => toggleStatus(s)}
                    onSelect={(e) => e.preventDefault()}
                    className="flex items-center justify-between"
                  >
                    <span>{s}</span>
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">{groupCounts[s]}</span>
                  </DropdownMenuCheckboxItem>
                ))}
                {statusFilter.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <button
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                      onClick={() => setStatusFilter(new Set())}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-10 shrink-0 text-muted-foreground animate-fade-in" onClick={clearAll}>
                <X className="size-4 mr-1.5" /> Clear all
              </Button>
            )}
          </div>

          {/* Table — desktop / tablet */}
          <div className="hidden md:block bg-card border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">
                      <SortHeader label="Patient" sortKey="patient_name" sort={sort} onSort={toggleSort} align="left" />
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold">Step 1 – Refax Same</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Step 2 – Refax New</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Step 3 – Reupload ROI</th>
                    <th className="px-3 py-2.5 text-center font-semibold">
                      <SortHeader label="Overall Status" sortKey="overall_status" sort={sort} onSort={toggleSort} align="center" />
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold">Notes</th>
                    <th className="px-3 py-2.5 text-center font-semibold w-12" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td colSpan={7} className="px-3 py-2.5"><Skeleton height={28} borderRadius={4} /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-16 text-center text-muted-foreground animate-fade-in">
                        <FileWarning className="size-10 opacity-20 mx-auto mb-3" />
                        <p className="text-sm">
                          {rows.length === 0 ? "No patients tracked yet. Add your first one." : "No patients match your filters."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const mine = row.created_by === user?.id;
                      return (
                        <tr key={row.id} className={cn("border-t border-border transition-colors", rowClasses(row.overall_status), newIds.has(row.id) && "animate-row-in")}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => copyName(row.patient_name)}
                              title="Click to copy name"
                              className="press-scale font-medium text-foreground rounded px-1 -mx-1 text-left hover:bg-foreground/10 hover:underline underline-offset-2 transition-colors cursor-pointer"
                            >
                              {row.patient_name}
                            </button>
                          </td>
                          <StepCell status={row.step1} />
                          <StepCell status={row.step2} />
                          <StepCell status={row.step3} />
                          <td className={cn("px-3 py-2 text-center text-sm font-semibold", overallClasses(row.overall_status))}>
                            {displayStatus(row.overall_status)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={row.notes ?? ""}>
                            {row.notes || <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {mine ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36 font-[system-ui]">
                                  <button
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                                    onClick={() => openEdit(row)}
                                  >
                                    <Pencil className="size-3.5" /> Edit
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm"
                                    onClick={() => setDeleteTarget(row)}
                                  >
                                    <Trash2 className="size-3.5" /> Delete
                                  </button>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs" title="Only the creator can edit this row">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards — phones */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-3.5">
                  <Skeleton height={20} width="55%" borderRadius={4} />
                  <Skeleton height={14} width="40%" borderRadius={4} className="!mt-2" />
                  <Skeleton height={64} borderRadius={6} className="!mt-3" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground animate-fade-in">
                <FileWarning className="size-10 opacity-20 mb-3" />
                <p className="text-sm">
                  {rows.length === 0 ? "No patients tracked yet. Add your first one." : "No patients match your filters."}
                </p>
              </div>
            ) : (
              filtered.map((row) => (
                <FaxCard
                  key={row.id}
                  row={row}
                  mine={row.created_by === user?.id}
                  isNew={newIds.has(row.id)}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <FaxEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} row={editing} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20 bg-background/95 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Delete this patient?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed">
              This permanently removes <span className="font-medium text-foreground">{deleteTarget?.patient_name}</span> from the fax tracker. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) deleteFax.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "sky" | "neutral";
  loading: boolean;
}) {
  const toneClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    sky: "text-sky-600 dark:text-sky-400",
    neutral: "text-foreground",
  }[tone];
  // Ease the count toward its new value so it ticks up/down on changes
  // (state indication) instead of snapping.
  const display = useAnimatedNumber(value);
  return (
    <div className="bg-card border border-border rounded-md p-3 sm:p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <Skeleton width={48} height={32} borderRadius={4} />
      ) : (
        <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums", toneClasses)}>{display}</p>
      )}
    </div>
  );
}

export default FaxTrackerPage;

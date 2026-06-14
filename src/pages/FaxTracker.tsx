import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useFaxTracker,
  useDeleteFax,
  type FaxRow,
  type FaxStepStatus,
} from "@/hooks/useFaxTracker";
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
import { Plus, Pencil, Trash2, Search, ListFilter, FileWarning, MoreVertical } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";

// ── Status → color classes ──────────────────────────────────────────────────
// Spreadsheet style: bold colored text (no badge boxes) on a tinted row.
function stepClasses(status: FaxStepStatus | null): string {
  switch (status) {
    case "Successfully Sent": return "text-emerald-700 dark:text-emerald-400";
    case "Failed":            return "text-rose-700 dark:text-rose-400";
    case "Waiting":           return "text-amber-600 dark:text-amber-400";
    case "Pending":           return "text-muted-foreground";
    default:                  return "text-muted-foreground/40";
  }
}

function overallClasses(status: string): string {
  if (status.startsWith("Resolved"))    return "text-emerald-700 dark:text-emerald-400";
  if (status === "All Steps Failed")    return "text-rose-700 dark:text-rose-400";
  if (status.startsWith("Waiting"))     return "text-amber-700 dark:text-amber-400";
  if (status.startsWith("Move to"))     return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

// The DB's auto-computed overall_status carries a trailing "#" (e.g.
// "Resolved – Refax Same #"). Strip it for display only; the raw value is kept
// for filtering/color logic so it still matches what the database stores.
function displayStatus(status: string): string {
  return status.replace(/\s*#\s*$/, "").trim();
}

// High-level filter groups. Each maps to one or more raw overall_status values.
const STATUS_GROUPS = ["Resolved", "Failed", "Waiting"] as const;
type StatusGroup = (typeof STATUS_GROUPS)[number];

function statusGroup(status: string): StatusGroup | null {
  if (status.startsWith("Resolved")) return "Resolved";
  if (status === "All Steps Failed") return "Failed";
  if (status.startsWith("Waiting")) return "Waiting";
  return null; // "Move to …" / "Pending" don't fall into the three buckets
}

// Whole-row tint: green for resolved, red for all-steps-failed (like the sheet).
function rowClasses(status: string): string {
  switch (statusGroup(status)) {
    case "Resolved": return "bg-emerald-500/[0.18] hover:bg-emerald-500/25";
    case "Failed":   return "bg-rose-500/[0.18] hover:bg-rose-500/25";
    case "Waiting":  return "bg-amber-400/[0.18] hover:bg-amber-400/25";
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

const FaxTrackerPage = () => {
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useFaxTracker();
  const deleteFax = useDeleteFax();

  const [now] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaxRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaxRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter.size) {
        const group = statusGroup(r.overall_status);
        if (!group || !statusFilter.has(group)) return false;
      }
      if (q && !r.patient_name.toLowerCase().includes(q) && !(r.notes ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, statusFilter]);

  // Summary counts (over all rows, matching the spreadsheet header).
  const stats = useMemo(() => {
    const resolved = rows.filter((r) => r.overall_status.startsWith("Resolved")).length;
    const allFailed = rows.filter((r) => r.overall_status === "All Steps Failed").length;
    const waiting = rows.filter((r) => r.overall_status.startsWith("Waiting")).length;
    return { resolved, allFailed, waiting, total: rows.length };
  }, [rows]);

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: FaxRow) => { setEditing(row); setDialogOpen(true); };

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
          <Button size="sm" className="h-8 shrink-0 bg-primary hover:bg-primary/95 text-primary-foreground" onClick={openAdd}>
            <Plus className="size-4 mr-1" /> Add Patient
          </Button>
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
                className="pl-9 h-10"
              />
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
                  >
                    {s}
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
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">Patient</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Step 1 – Refax Same</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Step 2 – Refax New</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Step 3 – Reupload ROI</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Overall Status</th>
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
                      <td colSpan={7} className="px-3 py-16 text-center text-muted-foreground">
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
                        <tr key={row.id} className={cn("border-t border-border transition-colors", rowClasses(row.overall_status))}>
                          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{row.patient_name}</td>
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
  return (
    <div className="bg-card border border-border rounded-md p-3 sm:p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <Skeleton width={48} height={32} borderRadius={4} />
      ) : (
        <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums", toneClasses)}>{value}</p>
      )}
    </div>
  );
}

export default FaxTrackerPage;

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useFaxTracker, useDeleteFax, useUpdateStep as useFaxUpdateStep, fetchAllFaxRows, STEP_STATUSES, type FaxRow, type FaxStepStatus, type StepField } from "@/hooks/useFaxTracker";
import { useIndexableTracker, useDeleteIndexable, useUpdateStep as useIndexableUpdateStep, fetchAllIndexableRows } from "@/hooks/useIndexableTracker";
import { useFaxAccounts, useDeleteFaxAccount, type FaxAccount } from "@/hooks/useFaxAccounts";
import { downloadFaxPDF } from "@/lib/fax-utils";
import { downloadIndexablePDF } from "@/lib/indexable-utils";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { PageHeader } from "@/components/ar/PageHeader";
import { FaxEntryDialog } from "@/components/ar/fax/FaxEntryDialog";
import { IndexableEntryDialog } from "@/components/ar/indexable/IndexableEntryDialog";
import { NewAccountDialog } from "@/components/ar/fax/NewAccountDialog";
import { RenameAccountDialog } from "@/components/ar/fax/RenameAccountDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Search, ListFilter, CalendarDays, FileWarning, MoreVertical, FileText, X, ArrowUp, ArrowDown, ArrowUpDown, Check, ChevronDown, ChevronLeft, ChevronRight, Users } from "lucide-react";
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

function stepClasses(status: FaxStepStatus | null): string {
  switch (status) {
    case "Successfully Sent": return "text-emerald-700 dark:text-white";
    case "Failed":            return "text-rose-700 dark:text-white";
    case "Waiting":           return "text-amber-600 dark:text-white";
    case "Pending":           return "text-muted-foreground dark:text-white";
    default:                  return "text-muted-foreground/40";
  }
}

function stepMenuClasses(status: FaxStepStatus | null): string {
  switch (status) {
    case "Successfully Sent": return "text-emerald-700 dark:text-emerald-300";
    case "Failed":            return "text-rose-700 dark:text-rose-300";
    case "Waiting":           return "text-amber-600 dark:text-amber-300";
    case "Pending":           return "text-muted-foreground";
    default:                  return "text-muted-foreground/40";
  }
}

function overallClasses(status: string): string {
  if (status.startsWith("Resolved"))    return "text-emerald-700 dark:text-white";
  if (status === "All Steps Failed")    return "text-rose-700 dark:text-white";
  if (status.startsWith("Waiting"))     return "text-amber-700 dark:text-white";
  if (status.startsWith("Move to"))     return "text-amber-600 dark:text-white";
  return "text-muted-foreground dark:text-white";
}

function displayStatus(status: string): string {
  return status.replace(/\s*#\s*$/, "").trim();
}

function formatDateTime(value: string | null | undefined): { date: string; time: string } | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_GROUPS = ["Resolved", "Failed", "Waiting", "Incomplete"] as const;
type StatusGroup = (typeof STATUS_GROUPS)[number];

type SortKey = "patient_name" | "overall_status" | "updated_at";

function statusGroup(status: string): StatusGroup | null {
  if (status.startsWith("Resolved")) return "Resolved";
  if (status === "All Steps Failed") return "Failed";
  if (status.startsWith("Waiting")) return "Waiting";
  if (status.startsWith("Move to") || status === "Pending") return "Incomplete";
  return null;
}

function rowClasses(status: string): string {
  switch (statusGroup(status)) {
    case "Resolved":   return "bg-emerald-500/[0.16] hover:bg-emerald-500/25 dark:bg-emerald-500/[0.04] dark:hover:bg-emerald-500/[0.08]";
    case "Failed":     return "bg-rose-500/[0.16] hover:bg-rose-500/25 dark:bg-rose-500/[0.04] dark:hover:bg-rose-500/[0.08]";
    case "Waiting":    return "bg-amber-400/[0.16] hover:bg-amber-400/25 dark:bg-amber-400/[0.045] dark:hover:bg-amber-400/[0.09]";
    case "Incomplete": return "bg-slate-400/[0.12] hover:bg-slate-400/20 dark:bg-slate-400/[0.04] dark:hover:bg-slate-400/[0.08]";
    default:           return "hover:bg-muted/30";
  }
}

type TrackerMode = "fax" | "indexable";

function stepIsActive(row: FaxRow, field: StepField, mode: TrackerMode): boolean {
  if (mode === "indexable") return true;
  if (field === "step1") return true;
  if (field === "step2") return row.step1 === "Failed";
  return row.step1 === "Failed" && row.step2 === "Failed";
}

function stepIsSkipped(row: FaxRow, field: StepField, mode: TrackerMode): boolean {
  if (mode !== "indexable") return false;
  const status = row[field];
  if (status && status !== "Pending") return false;
  const laterFields: StepField[] = field === "step1" ? ["step2", "step3"] : field === "step2" ? ["step3"] : [];
  return laterFields.some((f) => row[f] === "Successfully Sent");
}

function StepPicker({
  row,
  field,
  status,
  onPick,
  labels,
  triggerClassName,
}: {
  row: FaxRow;
  field: StepField;
  status: FaxStepStatus | null;
  onPick: (value: FaxStepStatus) => void;
  labels: [string, string, string];
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Click to change status"
          className={cn(
            "press-scale inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold transition-colors hover:bg-foreground/10",
            status ? stepClasses(status) : "text-muted-foreground/50",
            triggerClassName,
          )}
        >
          {status ?? "Set status"}
          <ChevronDown className="size-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-44 font-sans">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{labels[Number(field.slice(-1)) - 1]}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STEP_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => { if (s !== status) onPick(s); }}
            className={cn("flex items-center justify-between gap-2", stepMenuClasses(s))}
          >
            <span className="font-medium">{s}</span>
            {s === status && <Check className="size-3.5 opacity-80" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StepCell({
  row,
  field,
  editable,
  onPick,
  labels,
  mode,
}: {
  row: FaxRow;
  field: StepField;
  editable: boolean;
  onPick: (value: FaxStepStatus) => void;
  labels: [string, string, string];
  mode: TrackerMode;
}) {
  const status = row[field];
  const active = stepIsActive(row, field, mode);

  if (!active) return <td className="px-3 py-2 text-center text-muted-foreground/40">—</td>;

  if (stepIsSkipped(row, field, mode)) {
    return <td className="px-3 py-2 text-center text-xs font-medium text-muted-foreground/60 italic">No need</td>;
  }

  if (!editable) {
    return (
      <td className={cn("px-3 py-2 text-center text-sm font-semibold", status ? stepClasses(status) : "text-muted-foreground/40")}>
        {status ?? "—"}
      </td>
    );
  }

  return (
    <td className="px-3 py-2 text-center">
      <StepPicker row={row} field={field} status={status} onPick={onPick} labels={labels} />
    </td>
  );
}

function stepLabels(mode: TrackerMode): [string, string, string] {
  return [
    "Step 1 – Refax Same",
    "Step 2 – Refax New",
    mode === "indexable" ? "Step 3 – Reupload Indexable" : "Step 3 – Reupload ROI",
  ];
}

function FaxCard({
  row,
  mine,
  isNew,
  onEdit,
  onDelete,
  onPickStep,
  labels,
  mode,
}: {
  row: FaxRow;
  mine: boolean;
  isNew: boolean;
  onEdit: (row: FaxRow) => void;
  onDelete: (row: FaxRow) => void;
  onPickStep: (field: StepField, value: FaxStepStatus) => void;
  labels: [string, string, string];
  mode: TrackerMode;
}) {
  const fields: StepField[] = ["step1", "step2", "step3"];
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
                                <DropdownMenuContent align="end" className="w-36 font-sans">
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

      <div className={cn("mt-1 text-sm font-semibold", overallClasses(row.overall_status))}>
        {displayStatus(row.overall_status)}
      </div>

      <dl className="mt-3 space-y-1">
        {fields.map((field, i) => {
          const status = row[field];
          const active = stepIsActive(row, field, mode);
          const skipped = stepIsSkipped(row, field, mode);
          return (
            <div key={field} className="flex items-center justify-between gap-3 text-sm min-h-8">
              <dt className="text-muted-foreground">{labels[i]}</dt>
              <dd className="text-right">
                {!active ? (
                  <span className="font-semibold text-muted-foreground/40">—</span>
                ) : skipped ? (
                  <span className="text-xs font-medium text-muted-foreground/60 italic">No need</span>
                ) : mine ? (
                  <StepPicker row={row} field={field} status={status} onPick={(v) => onPickStep(field, v)} labels={labels} />
                ) : (
                  <span className={cn("font-semibold", status ? stepClasses(status) : "text-muted-foreground/40")}>
                    {status ?? "—"}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
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
      <Icon key={active ? sort.dir : "idle"} className={cn("size-3 animate-fade-in", active ? "opacity-100" : "opacity-40")} />
    </button>
  );
}

const ACCOUNT_KEY = "fax-tracker-account";
const MODE_KEY = "tracker-mode";
const PAGE_SIZE = 25;

const MODES: { id: TrackerMode; label: string }[] = [
  { id: "fax", label: "Fax" },
  { id: "indexable", label: "Indexable" },
];

const pageNumbersArr = (totalPages: number, page: number): (number | "…")[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const nums: (number | "…")[] = [1];
  if (page > 3) nums.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i);
  if (page < totalPages - 2) nums.push("…");
  nums.push(totalPages);
  return nums;
};

const FaxTrackerPage = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: accounts = [], isLoading: accountsLoading } = useFaxAccounts();

  const [mode, setMode] = useState<TrackerMode>(
    () => (localStorage.getItem(MODE_KEY) as TrackerMode) || "fax",
  );
  useEffect(() => { localStorage.setItem(MODE_KEY, mode); }, [mode]);

  const deleteAccount = useDeleteFaxAccount();
  const [accountId, setAccountId] = useState<string | null>(() => localStorage.getItem(ACCOUNT_KEY));
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<FaxAccount | null>(null);
  const [accountToRename, setAccountToRename] = useState<FaxAccount | null>(null);

  useEffect(() => {
    if (accountsLoading || accounts.length === 0) return;
    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountsLoading, accountId]);

  useEffect(() => {
    if (accountId) localStorage.setItem(ACCOUNT_KEY, accountId);
    setPage(1);
  }, [accountId]);

  useEffect(() => {
    setPage(1);
    setSearch("");
    setStatusFilter(new Set());
    setEditing(null);
    setDeleteTarget(null);
    seenIds.current = null;
  }, [mode]);

  const activeAccount = accounts.find((a) => a.id === accountId) ?? null;
  const isFax = mode === "fax";

  // Both hooks are always called per Rules of Hooks; pick the active one.
  const faxQuery = useFaxTracker(isFax ? (accountId ?? undefined) : undefined);
  const indexableQuery = useIndexableTracker(isFax ? undefined : (accountId ?? undefined));
  const { data: rows = [], isLoading } = isFax ? faxQuery : indexableQuery;

  const deleteFax = useDeleteFax();
  const deleteIndexable = useDeleteIndexable();
  const updateFaxStep = useFaxUpdateStep();
  const updateIndexableStep = useIndexableUpdateStep();

  const deleteRow = isFax ? deleteFax : deleteIndexable;

  const pickStep = (row: FaxRow, field: StepField, value: FaxStepStatus) => {
    if (isFax) updateFaxStep.mutate({ row, field, value });
    else updateIndexableStep.mutate({ row, field, value });
  };

  const labels = stepLabels(mode);
  const [exporting, setExporting] = useState(false);

  const [now] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaxRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaxRow | null>(null);

  const matchesFilters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (r: FaxRow) => {
      if (statusFilter.size) {
        const group = statusGroup(r.overall_status);
        if (!group || !statusFilter.has(group)) return false;
      }
      if (dateFilter.size) {
        const key = dateKey(r.updated_at);
        if (!key || !dateFilter.has(key)) return false;
      }
      if (q && !r.patient_name.toLowerCase().includes(q) && !(r.notes ?? "").toLowerCase().includes(q)) return false;
      return true;
    };
  }, [search, statusFilter, dateFilter]);

  const filtered = useMemo(() => {
    const rowsFiltered = rows.filter(matchesFilters);
    if (!sort) {
      return [...rowsFiltered].sort((a, b) => {
        const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bt - at;
      });
    }
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rowsFiltered].sort((a, b) => {
      if (sort.key === "updated_at") {
        const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return (at - bt) * dir;
      }
      const av = sort.key === "patient_name" ? a.patient_name : displayStatus(a.overall_status);
      const bv = sort.key === "patient_name" ? b.patient_name : displayStatus(b.overall_status);
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
    });
  }, [rows, matchesFilters, sort]);

  useEffect(() => { setPage(1); }, [search, statusFilter, dateFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );
  const pageNumbers = useMemo(() => pageNumbersArr(totalPages, page), [totalPages, page]);

  const seenIds = useRef<Set<string> | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(rows.map((r) => r.id));
    if (seenIds.current === null) {
      seenIds.current = current;
      return;
    }
    const added = [...current].filter((id) => !seenIds.current!.has(id));
    seenIds.current = current;
    if (added.length === 0) return;
    setNewIds(new Set(added));
    const t = setTimeout(() => setNewIds(new Set()), 400);
    return () => clearTimeout(t);
  }, [rows]);

  const groupCounts = useMemo(() => {
    const counts: Record<StatusGroup, number> = { Resolved: 0, Failed: 0, Waiting: 0, Incomplete: 0 };
    for (const r of rows) {
      const g = statusGroup(r.overall_status);
      if (g) counts[g]++;
    }
    return counts;
  }, [rows]);

  const dataDayKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of rows) {
      const key = dateKey(r.updated_at);
      if (key) keys.add(key);
    }
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [rows]);
  const dataKeySet = useMemo(() => new Set(dataDayKeys), [dataDayKeys]);
  const datesWithData = useMemo(
    () => dataDayKeys.map((k) => new Date(`${k}T12:00:00`)),
    [dataDayKeys],
  );
  const selectedDates = useMemo(
    () => [...dateFilter].map((k) => new Date(`${k}T12:00:00`)),
    [dateFilter],
  );

  const stats = useMemo(
    () => ({
      resolved: groupCounts.Resolved,
      allFailed: groupCounts.Failed,
      waiting: groupCounts.Waiting,
      incomplete: groupCounts.Incomplete,
      total: rows.length,
    }),
    [groupCounts, rows.length],
  );

  const hasActiveFilters = search.trim() !== "" || statusFilter.size > 0 || dateFilter.size > 0;
  const clearAll = () => { setSearch(""); setStatusFilter(new Set()); setDateFilter(new Set()); };

  const handleSelectDates = (days: Date[] | undefined) => {
    const keys = (days ?? [])
      .map((d) => dateKey(d.toISOString()))
      .filter((k): k is string => k !== null);
    setDateFilter(new Set(keys));
  };

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: FaxRow) => { setEditing(row); setDialogOpen(true); };

  const handleExport = async (allAccounts = false) => {
    setExporting(true);
    try {
      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined;
      const activeFilters = statusFilter.size ? Array.from(statusFilter).join(", ") : null;

      let exportRows: FaxRow[] = filtered;
      let accountName: ((row: FaxRow) => string) | undefined;
      if (allAccounts) {
        const all = isFax ? await fetchAllFaxRows() : await fetchAllIndexableRows();
        exportRows = all
          .filter(matchesFilters)
          .sort((a, b) => {
            const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bt - at;
          });
        if (exportRows.length === 0) {
          toast.error("No matching rows across any account.");
          return;
        }
        const nameById = new Map(accounts.map((a) => [a.id, a.name]));
        accountName = (row) => nameById.get(row.account_id) ?? "—";
      }

      const subtitleBits = [
        allAccounts
          ? `Accounts: All (${new Set(exportRows.map((r) => r.account_id)).size})`
          : activeAccount ? `Account: ${activeAccount.name}` : null,
        activeFilters ? `Status: ${activeFilters}` : "All patients",
        search.trim() ? `Search: "${search.trim()}"` : null,
      ].filter(Boolean);

      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const accountPart = allAccounts ? "all-accounts-" : activeAccount ? `${slug(activeAccount.name)}-` : "";
      const statusPart = statusFilter.size
        ? STATUS_GROUPS.filter((g) => statusFilter.has(g)).map(slug).join("-")
        : "all";
      const searchPart = search.trim() ? `-${slug(search.trim())}` : "";
      const datePart = new Date().toISOString().slice(0, 10);
      const prefix = isFax ? "fax-tracker" : "indexable-tracker";
      const filename = `${prefix}-${accountPart}${statusPart}${searchPart}-${datePart}.pdf`;

      const download = isFax ? downloadFaxPDF : downloadIndexablePDF;
      await download(exportRows, filename, {
        userName,
        subtitle: subtitleBits.join("  ·  "),
        accountName,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
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

  const EntryDialog = isFax ? FaxEntryDialog : IndexableEntryDialog;

  return (
    <>
      <PageHeader
        now={now}
        subtitle="Tracker"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 shrink-0 min-w-32 justify-between">
                  {MODES.find((m) => m.id === mode)?.label ?? "Fax"}
                  <ChevronDown className="size-4 ml-1.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32 font-sans">
                {MODES.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="flex items-center justify-between"
                  >
                    {m.label}
                    {mode === m.id && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={exporting || filtered.length === 0}
                  title={filtered.length === 0 ? "Nothing to export" : "Export to PDF"}
                >
                  <FileText className="size-4 mr-1" />
                  {exporting ? "Exporting…" : "Export PDF"}
                  <ChevronDown className="size-4 ml-1.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 font-sans">
                <DropdownMenuItem onClick={() => handleExport(false)}>
                  <div className="flex flex-col">
                    <span>This account only</span>
                    <span className="text-xs text-muted-foreground">
                      {activeAccount?.name ?? "Current account"} · current view
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport(true)}>
                  <div className="flex flex-col">
                    <span>All accounts</span>
                    <span className="text-xs text-muted-foreground">
                      Same filters across every account
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              className="h-8 shrink-0 bg-primary hover:bg-primary/95 text-primary-foreground"
              onClick={openAdd}
              disabled={!accountId}
              title={!accountId ? "Create an account first" : undefined}
            >
              <Plus className="size-4 mr-1" /> Add Patient
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div key={mode} className="w-full space-y-4 animate-fade-in">

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard label="Resolved" value={stats.resolved} tone="emerald" loading={isLoading} />
            <StatCard label="All Steps Failed" value={stats.allFailed} tone="rose" loading={isLoading} />
            <StatCard label="Waiting" value={stats.waiting} tone="sky" loading={isLoading} />
            <StatCard label="Incomplete" value={stats.incomplete} tone="slate" loading={isLoading} />
            <StatCard label="Total Patients" value={stats.total} tone="neutral" loading={isLoading} />
          </div>

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
                <Button variant="outline" size="sm" className="h-10 shrink-0 max-w-[12rem]" disabled={accountsLoading}>
                  <Users className="size-4 mr-1.5 shrink-0" />
                  <span className="truncate">{activeAccount?.name ?? (accountsLoading ? "Loading…" : "No account")}</span>
                  <ChevronDown className="size-3 ml-1 opacity-60 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 font-sans">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Switch account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accounts.map((a) => (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => setAccountId(a.id)}
                    className="flex items-center justify-between gap-2 pr-1"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {a.id === accountId
                        ? <Check className="size-3.5 opacity-80 shrink-0" />
                        : <span className="size-3.5 shrink-0" />}
                      <span className="truncate">{a.name}</span>
                    </span>
                    <span className="flex items-center shrink-0">
                      <button
                        type="button"
                        title={`Rename ${a.name}`}
                        onClick={(e) => { e.stopPropagation(); setAccountToRename(a); }}
                        className="press-scale p-1 rounded text-muted-foreground/70 hover:text-foreground hover:bg-foreground/10 transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title={`Delete ${a.name}`}
                        onClick={(e) => { e.stopPropagation(); setAccountToDelete(a); }}
                        className="press-scale p-1 rounded text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAccountDialogOpen(true)} className="text-primary">
                  <Plus className="size-3.5 mr-1.5" /> New account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 shrink-0">
                  <ListFilter className="size-4 mr-1.5" />
                  Status{statusFilter.size ? ` (${statusFilter.size})` : ""}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-sans">
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

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 shrink-0">
                  <CalendarDays className="size-4 mr-1.5" />
                  Date{dateFilter.size ? ` (${dateFilter.size})` : ""}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0 font-sans">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={handleSelectDates}
                  defaultMonth={selectedDates[0] ?? datesWithData[0]}
                  modifiers={{ hasData: datesWithData }}
                  modifiersClassNames={{
                    hasData: "font-semibold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary after:transition-opacity data-[selected=true]:after:opacity-0",
                  }}
                  classNames={{
                    cell: "size-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day: "day-cell inline-flex items-center justify-center size-9 rounded-full p-0 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100",
                    day_selected:
                      "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "ring-1 ring-inset ring-primary/40",
                    day_disabled: "text-muted-foreground/40 opacity-50",
                  }}
                  disabled={(day) => !dataKeySet.has(dateKey(day.toISOString())!)}
                />
                {dateFilter.size > 0 && (
                  <div className="border-t border-border px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {dateFilter.size} day{dateFilter.size > 1 ? "s" : ""} selected
                    </span>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setDateFilter(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-10 shrink-0 text-muted-foreground animate-fade-in" onClick={clearAll}>
                <X className="size-4 mr-1.5" /> Clear all
              </Button>
            )}
          </div>

          <div className="hidden md:block bg-card border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">
                      <SortHeader label="Patient" sortKey="patient_name" sort={sort} onSort={toggleSort} align="left" />
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold">{labels[0]}</th>
                    <th className="px-3 py-2.5 text-center font-semibold">{labels[1]}</th>
                    <th className="px-3 py-2.5 text-center font-semibold">{labels[2]}</th>
                    <th className="px-3 py-2.5 text-center font-semibold">
                      <SortHeader label="Overall Status" sortKey="overall_status" sort={sort} onSort={toggleSort} align="center" />
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold">Notes</th>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      <SortHeader label="Date & Time" sortKey="updated_at" sort={sort} onSort={toggleSort} align="left" />
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold w-12" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td colSpan={8} className="px-3 py-2.5"><Skeleton height={28} borderRadius={4} /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-16 text-center text-muted-foreground animate-fade-in">
                        <FileWarning className="size-10 opacity-20 mx-auto mb-3" />
                        <p className="text-sm">
                          {rows.length === 0 ? "No patients tracked yet. Add your first one." : "No patients match your filters."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((row) => {
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
                          {(["step1", "step2", "step3"] as StepField[]).map((field) => (
                            <StepCell
                              key={field}
                              row={row}
                              field={field}
                              editable={mine}
                              onPick={(value) => pickStep(row, field, value)}
                              labels={labels}
                              mode={mode}
                            />
                          ))}
                          <td className={cn("px-3 py-2 text-center text-sm font-semibold", overallClasses(row.overall_status))}>
                            {displayStatus(row.overall_status)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={row.notes ?? ""}>
                            {row.notes || <span className="text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {(() => {
                              const dd = formatDateTime(row.updated_at);
                              return dd ? (
                                <div className="leading-tight">
                                  <div className="text-foreground">{dd.date}</div>
                                  <div className="text-xs text-muted-foreground">{dd.time}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {mine ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 font-sans">
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
            {!isLoading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                pageNumbers={pageNumbers}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </div>

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
              <>
                {paginated.map((row) => (
                  <FaxCard
                    key={row.id}
                    row={row}
                    mine={row.created_by === user?.id}
                    isNew={newIds.has(row.id)}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onPickStep={(field, value) => pickStep(row, field, value)}
                    labels={labels}
                    mode={mode}
                  />
                ))}
                {totalPages > 1 && (
                  <div className="rounded-lg border border-border">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      pageNumbers={pageNumbers}
                      total={filtered.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <EntryDialog open={dialogOpen} onOpenChange={setDialogOpen} row={editing} accountId={accountId ?? undefined} />

      <NewAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onCreated={(account) => setAccountId(account.id)}
      />

      <RenameAccountDialog
        open={!!accountToRename}
        onOpenChange={(o) => !o && setAccountToRename(null)}
        account={accountToRename}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20 bg-background/95 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Delete this patient?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed">
              This permanently removes <span className="font-medium text-foreground">{deleteTarget?.patient_name}</span> from the {mode} tracker. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) deleteRow.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!accountToDelete} onOpenChange={(o) => !o && setAccountToDelete(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20 bg-background/95 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Delete account?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed">
              This deletes the account <span className="font-medium text-foreground">{accountToDelete?.name}</span>
              {" "}and <span className="font-medium text-destructive">all of its patients in both Fax and Indexable</span>. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                const target = accountToDelete;
                if (!target) return;
                deleteAccount.mutate(target.id, {
                  onSuccess: () => {
                    if (target.id === accountId) {
                      const next = accounts.find((a) => a.id !== target.id);
                      setAccountId(next ? next.id : null);
                    }
                  },
                });
                setAccountToDelete(null);
              }}
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function Pagination({
  page,
  totalPages,
  pageNumbers,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  pageNumbers: (number | "…")[];
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="border-t border-border/40 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-center sm:justify-between gap-2">
      <span className="text-xs text-muted-foreground font-medium">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} patients
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 sm:size-8 border border-border/40 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-[color,background-color,transform] duration-150"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${pageNumbers[i + 1] ?? i}`} className="w-8 text-center text-xs text-muted-foreground/60 select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={page === p ? "default" : "ghost"}
              size="icon"
              className={cn(
                "size-9 sm:size-8 text-xs font-semibold rounded-md border active:scale-95 transition-[color,background-color,border-color,transform] duration-150",
                page === p
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/10"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/80",
              )}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 sm:size-8 border border-border/40 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-[color,background-color,transform] duration-150"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "sky" | "slate" | "neutral";
  loading: boolean;
}) {
  const toneClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    sky: "text-sky-600 dark:text-sky-400",
    slate: "text-slate-500 dark:text-slate-300",
    neutral: "text-foreground",
  }[tone];
  const display = useAnimatedNumber(value);
  return (
    <div className="bg-card border border-border rounded-md p-3 sm:p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-heading">{label}</p>
      {loading ? (
        <Skeleton width={48} height={32} borderRadius={4} />
      ) : (
        <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums", toneClasses)}>{display}</p>
      )}
    </div>
  );
}

export default FaxTrackerPage;
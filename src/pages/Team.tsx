import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  useTeamProfiles,
  useTeamDailyLogs,
  useSetUserRole,
  useDeleteUser,
  useTeamUserFaxedBack,
  useTeamUserCategories,
  useTeamUserAuditLogs,
  useTeamUserLogs,
  fetchAllUserLogs,
  fetchAllUserFaxedBack,
  type TeamFaxedBackDoc,
} from "@/hooks/useTeamData";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useProfile } from "@/hooks/useProfile";
import { isoDate, totalForLog, formatTableDate, formatDayName, isWeekend, type DailyLog } from "@/types/log";
import { downloadCSV, downloadPDF, formatUSDate } from "@/lib/log-utils";
import {
  Users, FileText, CalendarCheck, TrendingUp, ChevronRight, Search, ArrowLeft, BedDouble,
  Shield, FileCheck2, Tags, History, LayoutGrid, Clock, MoreVertical, Trash2, ShieldCheck, ShieldX,
  Sun, Target, Loader2, CheckCheck, X, Ban, Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FigHeader, EmptyState } from "@/components/ar/industrial";
import { labelFor, displayStatus, overallClasses, formatDateTime, pageNumbersArr } from "@/components/ar/tracker/tracker-helpers";
import { Pagination } from "@/components/Pagination";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-3 flex items-center gap-3 transition-colors hover:border-border/80">
      <div className="size-8 sm:size-9 rounded-lg grid place-items-center text-primary bg-primary/[0.07] shrink-0">
        <Icon className="size-4 sm:size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg sm:text-xl font-bold tabular-nums tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function computeStats(logs: DailyLog[]) {
  const working = logs.filter((l) => !l.is_off_day);
  const daysWorked = working.length;
  const totalDocs = working.reduce((s, l) => s + totalForLog(l), 0);
  const avg = working.length > 0 ? Math.round(totalDocs / working.length) : 0;
  return { daysWorked, totalDocs, avg };
}

type Tab = "overview" | "logs" | "faxed-back" | "categories" | "activity";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "logs", label: "Daily Logs", icon: CalendarCheck },
  { id: "faxed-back", label: "Faxed Back", icon: FileCheck2 },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "activity", label: "Activity", icon: History },
];

// Highlights the first case-insensitive match of `query` in `text`.
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/15 text-primary rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// Debounce: API fires 300ms after typing pauses, not per keystroke.
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// Same icons/colors as the Faxed Back page's status picker.
function FBStatusIcon({ status }: { status: string }) {
  if (status === "Pending") return <Loader2 className="size-3.5 text-blue-500 animate-spin" />;
  if (status === "Sent") return <CheckCheck className="size-3.5 text-emerald-500" />;
  if (status === "Failed") return <X className="size-3.5 text-rose-500" />;
  if (status === "Rejected") return <Ban className="size-3.5 text-amber-500" />;
  return null;
}

const FB_FILTERS_INITIAL = { search: "" };

// Same rule as the Faxed Back page: export names with a .pdf suffix.
const withPdf = (name: string) => (/\.pdf$/i.test(name) ? name : `${name}.pdf`);

function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function faxedBackCSV(rows: TeamFaxedBackDoc[]): string {
  const safe = (v: unknown) => {
    const s = v == null ? "" : /^[=+@\-|%]/.test(String(v)) ? `'${v}` : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ["File Name", "Patient Name", "Patient DOB", "Worked On", "Status", "Fax Back Message"];
  const body = rows.map((r) =>
    [withPdf(r.file_name), r.patient_name, r.patient_dob ? formatUSDate(r.patient_dob) : "", r.worked_on, r.status, r.notes ?? ""]
      .map(safe)
      .join(","),
  );
  return [headers.join(","), ...body].join("\n");
}

function SectionCard({ title, sub, children, actions }: { title: string; sub?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <FigHeader title={title} sub={sub} />
        {actions}
      </div>
      {children}
    </div>
  );
}

// ── Friendly audit event descriptions ───────────────────────────────────────
// Turns raw event names + JSON details into plain sentences for the Activity tab.
function describeEvent(
  event: string,
  details: Record<string, unknown> | null,
  nameForId: (id: string) => string | null,
): string {
  const d = details ?? {};
  switch (event) {
    case "log_updated": return `Saved the daily log for ${d.log_date ?? "that day"}`;
    case "log_deleted": return "Deleted a daily log entry";
    case "category_created": return `Created the category "${d.key ?? "unknown"}"`;
    case "category_updated": return `Renamed the category "${d.key ?? "unknown"}"`;
    case "category_deleted": return `Deleted the category "${d.key ?? "unknown"}"`;
    case "categories_reordered": return "Reordered categories";
    case "account_deleted": return "Deleted a fax account";
    case "password_changed": return "Changed the account password";
    case "data_exported": return "Exported data";
    case "fax_created": return `Added ${d.patient_name ?? "a patient"} to the Fax tracker`;
    case "fax_updated": return d.field
      ? `Updated ${stepLabel(d.field)} of a Fax tracker entry to ${statusLabel(d.value)}`
      : "Updated a Fax tracker entry";
    case "fax_deleted": return "Removed a Fax tracker entry";
    case "indexable_created": return `Added ${d.patient_name ?? "a patient"} to the Indexable tracker`;
    case "indexable_updated": return d.field
      ? `Updated ${stepLabel(d.field)} of an Indexable tracker entry to ${statusLabel(d.value)}`
      : "Updated an Indexable tracker entry";
    case "indexable_deleted": return "Removed an Indexable tracker entry";
    case "faxed_back_created": return `Added "${d.file_name ?? "a document"}" to Faxed Back`;
    case "faxed_back_updated": return d.field === "status"
      ? `Changed a Faxed Back document to "${d.value}"`
      : "Updated a Faxed Back document";
    case "faxed_back_deleted": return "Removed a Faxed Back document";
    case "faxed_back_section_deleted": return "Deleted a whole Faxed Back section";
    case "role_changed": {
      const name = typeof d.target_user_id === "string" ? nameForId(d.target_user_id) : null;
      const who = name ?? "A team member";
      return d.role === "admin" ? `Made ${who} an admin` : `Removed admin from ${who}`;
    }
    default: return event.replace(/_/g, " ");
  }
}

// What changed and what it was before — shown in the expanded row.
function changeRows(
  event: string,
  details: Record<string, unknown> | null,
): { label: string; before: string; after: string }[] {
  const d = details ?? {};
  const out: { label: string; before: string; after: string }[] = [];
  const push = (label: string, before: unknown, after: unknown) => {
    const b = before === null || before === undefined ? "—" : String(before);
    const a = after === null || after === undefined ? "—" : String(after);
    if (b === a) return;
    out.push({ label, before: b, after: a });
  };

  switch (event) {
    case "fax_updated":
    case "indexable_updated":
      if (d.field) push(stepLabel(d.field), d.prev, d.value);
      if (d.patient_name) push("Patient name", undefined, d.patient_name);
      break;
    case "faxed_back_updated":
      if (d.field) push(d.field === "status" ? "Status" : String(d.field), d.prev, d.value);
      if (d.file_name) push("File name", undefined, d.file_name);
      break;
    case "role_changed":
      push("Role", d.prev_role ?? "user", d.role);
      break;
    case "category_updated":
      if (d.key) push("Category", undefined, d.key);
      break;
    case "log_updated":
      if (d.log_date) push("Log date", undefined, d.log_date);
      break;
  }
  return out;
}

function stepLabel(field: unknown): string {
  return field === "step1" ? "Step 1" : field === "step2" ? "Step 2" : field === "step3" ? "Step 3" : String(field ?? "a step");
}

function statusLabel(value: unknown): string {
  return typeof value === "string" ? labelFor(value) : String(value ?? "");
}

export default function TeamPage() {
  const { user, loading } = useAuth();
  const { data: profiles = [], isLoading: profilesLoading } = useTeamProfiles();
  const { data: allLogs = [], isLoading: logsLoading } = useTeamDailyLogs();
  const isAdmin = useIsAdmin();
  const { isPending: profilePending } = useProfile();
  const setRole = useSetUserRole();
  const deleteUser = useDeleteUser();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [pages, setPages] = useState({ logs: 1, faxedBack: 1, categories: 1, activity: 1 });
  const [faxFilters, setFaxFilters] = useState(FB_FILTERS_INITIAL);
  const debouncedFaxSearch = useDebouncedValue(faxFilters.search);
  const [exporting, setExporting] = useState<"logs-csv" | "logs-pdf" | "faxed" | null>(null);

  const { data: logsPage = { rows: [], total: 0 }, isLoading: logsLoading2 } = useTeamUserLogs(selectedUserId, pages.logs, search.trim() || undefined);
  const { data: faxedBackPage = { rows: [], total: 0 }, isLoading: faxedBackLoading } = useTeamUserFaxedBack(selectedUserId, pages.faxedBack, {
    search: debouncedFaxSearch.trim() || undefined,
  });
  const { data: categoriesPage = { rows: [], total: 0 }, isLoading: categoriesLoading } = useTeamUserCategories(selectedUserId, pages.categories);
  const { data: auditPage = { rows: [], total: 0 }, isLoading: auditLoading } = useTeamUserAuditLogs(selectedUserId, pages.activity);

  const selectedLogs = logsPage.rows;
  const selectedFaxedBack = faxedBackPage.rows;
  const selectedCategories = categoriesPage.rows;
  const selectedAudit = auditPage.rows;
  const logsTotal = logsPage.total;
  const faxedBackTotal = faxedBackPage.total;
  const categoriesTotal = categoriesPage.total;
  const auditTotal = auditPage.total;

  const isLoading = profilesLoading || logsLoading;

  const logsByUser = useMemo(() => {
    const map = new Map<string, DailyLog[]>();
    for (const log of allLogs) {
      const arr = map.get(log.user_id);
      if (arr) arr.push(log);
      else map.set(log.user_id, [log]);
    }
    return map;
  }, [allLogs]);

  const memberCards = useMemo(() => {
    return profiles.map((p) => {
      const logs = logsByUser.get(p.id) ?? [];
      const stats = computeStats(logs);
      return { ...p, ...stats, logCount: logs.length };
    });
  }, [profiles, logsByUser]);

  const selectedMember = selectedUserId ? memberCards.find((m) => m.id === selectedUserId) : null;

  const today = isoDate();
  const todayEntry = selectedUserId ? (logsByUser.get(selectedUserId) ?? []).find((l) => l.log_date === today) : null;

  const isMe = selectedUserId === user?.id;

  const memberName = selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}`.trim() : "member";
  const memberSlug = memberName.replace(/\s+/g, "-").toLowerCase();

  const handleExportLogs = async (kind: "csv" | "pdf") => {
    if (!selectedUserId) return;
    setExporting(kind === "csv" ? "logs-csv" : "logs-pdf");
    try {
      const logs = await fetchAllUserLogs(selectedUserId);
      const filename = `${memberSlug}-daily-log.${kind}`;
      if (kind === "csv") downloadCSV(logs, selectedCategories, filename);
      else await downloadPDF(logs, selectedCategories, filename, { title: `${memberName} — Daily Log`, userName: memberName });
    } finally {
      setExporting(null);
    }
  };

  const handleExportFaxedBack = async () => {
    if (!selectedUserId) return;
    setExporting("faxed");
    try {
      const rows = await fetchAllUserFaxedBack(selectedUserId, { search: debouncedFaxSearch.trim() || undefined });
      downloadTextFile(faxedBackCSV(rows), `${memberSlug}-faxed-back.csv`, "text/csv;charset=utf-8;");
    } finally {
      setExporting(null);
    }
  };

  if (loading || profilePending) return null;
  if (!isAdmin) return <Navigate to="/log" replace />;

  // ── Team grid ──────────────────────────────────────────────────────────────
  if (!selectedUserId) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 animate-fade-in">
        <div className="w-full space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground mt-1">{profiles.length} members · Team overview</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card border border-border/50 rounded-full px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-success" /> Live
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-lg p-4 space-y-3">
                  <Skeleton width={120} height={16} />
                  <Skeleton width={80} height={12} />
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="space-y-1"><Skeleton height={10} /><Skeleton height={20} /></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <EmptyState icon={Users} title="No Team Members" hint="Only you so far." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberCards.map((m) => (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setSelectedUserId(m.id); setTab("overview"); setSearch(""); setFaxFilters(FB_FILTERS_INITIAL); setPages({ logs: 1, faxedBack: 1, categories: 1, activity: 1 }); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedUserId(m.id);
                      setTab("overview");
                      setSearch("");
                      setFaxFilters(FB_FILTERS_INITIAL);
                      setPages({ logs: 1, faxedBack: 1, categories: 1, activity: 1 });
                    }
                  }}
                  className="group bg-card border border-border/50 rounded-lg p-4 text-left hover:border-primary/30 hover:bg-muted/10 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-lg bg-primary/[0.08] border border-primary/15 grid place-items-center text-sm font-bold text-primary shrink-0">
                      {(m.first_name?.[0] ?? "").toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-2">
                        <span className="truncate">{m.first_name} {m.last_name}</span>
                        {m.role === "admin" && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            <Shield className="size-3" /> Admin
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{m.logCount} log entries</p>
                    </div>
                    {m.id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="size-8 shrink-0 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                            aria-label={`Actions for ${m.first_name} ${m.last_name}`}
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setRole.mutate({ targetUserId: m.id, role: m.role === "admin" ? "user" : "admin", prevRole: m.role });
                            }}
                            disabled={setRole.isPending}
                            className="cursor-pointer"
                          >
                            {m.role === "admin" ? <ShieldX className="size-4 mr-2" /> : <ShieldCheck className="size-4 mr-2" />}
                            {m.role === "admin" ? "Revoke admin" : "Make admin"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ id: m.id, name: `${m.first_name} ${m.last_name}` });
                            }}
                            disabled={deleteUser.isPending}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/40 bg-muted/20 p-2">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center justify-center gap-1"><CalendarCheck className="size-3" /> Days</p>
                      <p className="text-base font-bold tabular-nums mt-0.5">{m.daysWorked}</p>
                    </div>
                    <div className="text-center border-x border-border/40">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center justify-center gap-1"><FileText className="size-3" /> Docs</p>
                      <p className="text-base font-bold tabular-nums mt-0.5">{m.totalDocs}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center justify-center gap-1"><TrendingUp className="size-3" /> Avg</p>
                      <p className="text-base font-bold tabular-nums mt-0.5">{m.avg}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Drill-down ─────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 animate-fade-in">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedUserId(null); setSearch(""); setFaxFilters(FB_FILTERS_INITIAL); }}
              className="size-9 rounded-lg border border-border/50 bg-card text-muted-foreground hover:text-foreground hover:border-border transition-colors shrink-0 grid place-items-center"
              aria-label="Back to team"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="size-10 rounded-lg bg-primary/[0.08] border border-primary/15 grid place-items-center text-sm font-bold text-primary">
              {((selectedMember?.first_name?.[0] ?? "") + (selectedMember?.last_name?.[0] ?? "")).toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                {selectedMember?.first_name} {selectedMember?.last_name}
                {selectedMember?.role === "admin" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Shield className="size-3" /> Admin
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{isMe ? "You" : "Team member"}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card border border-border/50 rounded-full px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-success" /> {selectedMember?.first_name}'s panel
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 bg-card border border-border/50 rounded-lg p-1 w-fit max-w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-md text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              <StatCard icon={CalendarCheck} label="Days Worked" value={selectedMember?.daysWorked ?? 0} />
              <StatCard icon={FileText} label="Total Documents" value={selectedMember?.totalDocs ?? 0} />
              <StatCard icon={TrendingUp} label="Daily Average" value={selectedMember?.avg ?? 0} />
              <StatCard icon={ChevronRight} label="Today" value={!todayEntry || todayEntry.is_off_day ? 0 : totalForLog(todayEntry)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
              <StatCard icon={FileCheck2} label="Faxed Back" value={faxedBackTotal} />
              <StatCard icon={Tags} label="Categories" value={categoriesTotal} />
              <StatCard icon={History} label="Audit Events" value={auditTotal} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="bg-card border border-border/50 rounded-lg p-3.5">
                <p className="text-[10px] uppercase tracking-wider font-heading text-muted-foreground/70 mb-2 flex items-center gap-1.5">
                  <Sun className="size-3" /> Today
                </p>
                {!todayEntry ? (
                  <p className="text-sm text-muted-foreground">No entry logged yet today.</p>
                ) : todayEntry.is_off_day ? (
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <BedDouble className="size-4" /> {isWeekend(todayEntry.log_date) ? "Weekend" : "Off Day"}
                  </p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold tabular-nums text-primary">{totalForLog(todayEntry)}</span>
                      <span className="text-xs text-muted-foreground">documents today</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedCategories.map((c) => {
                        const v = (todayEntry.counts ?? {})[c.key] ?? 0;
                        return v > 0 ? (
                          <span key={c.key} className="text-xs font-medium px-2 py-0.5 rounded-full tabular-nums bg-muted/40 border border-border/40">{c.short} · {v}</span>
                        ) : null;
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="bg-card border border-border/50 rounded-lg p-3.5">
                <p className="text-[10px] uppercase tracking-wider font-heading text-muted-foreground/70 mb-2 flex items-center gap-1.5">
                  <Target className="size-3" /> Daily Goal
                </p>
                {selectedMember?.daily_goal ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold tabular-nums">{selectedMember.avg}</span>
                      <span className="text-xs text-muted-foreground">avg / {selectedMember.daily_goal} goal</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 mt-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.round((selectedMember.avg / selectedMember.daily_goal) * 100))}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No daily goal set.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider font-heading text-muted-foreground/70 px-3.5 pt-3 pb-2">Recent Logs</p>
                {logsLoading2 ? (
                  <div className="px-3.5 pb-3 space-y-2"><Skeleton height={24} count={3} /></div>
                ) : selectedLogs.length === 0 ? (
                  <p className="px-3.5 pb-3 text-xs text-muted-foreground">No logs yet.</p>
                ) : (
                  <div className="divide-y divide-border/40">
                    {selectedLogs.slice(0, 6).map((l) => {
                      const weekend = isWeekend(l.log_date);
                      const isOff = l.is_off_day;
                      return (
                        <div key={l.id} className="flex items-center justify-between px-3.5 py-2">
                          <div className="flex flex-col leading-tight">
                            <span className="text-xs font-medium tabular-nums">{formatTableDate(l.log_date)}</span>
                            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-heading">{formatDayName(l.log_date)}</span>
                          </div>
                          {isOff ? (
                            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide font-heading flex items-center gap-1">
                              <BedDouble className="size-3" /> {weekend ? "Weekend" : "Off"}
                            </span>
                          ) : (
                            <span className="text-sm font-bold tabular-nums text-primary">{totalForLog(l)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider font-heading text-muted-foreground/70 px-3.5 pt-3 pb-2">Recent Activity</p>
                {auditLoading ? (
                  <div className="px-3.5 pb-3 space-y-2"><Skeleton height={24} count={3} /></div>
                ) : selectedAudit.length === 0 ? (
                  <p className="px-3.5 pb-3 text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="divide-y divide-border/40">
                    {selectedAudit.slice(0, 6).map((a) => {
                      const dt = formatDateTime(a.created_at);
                      return (
                        <div key={a.id} className="flex items-start gap-2.5 px-3.5 py-2">
                          <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground leading-snug">
                              {describeEvent(a.event, a.details, (id) => {
                                const p = profiles.find((pr) => pr.id === id);
                                return p ? `${p.first_name} ${p.last_name}`.trim() : null;
                              })}
                            </p>
                            <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                              {dt ? `${dt.date} · ${dt.time}` : "—"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "logs" && (
          <SectionCard
            title="Daily Logs"
            sub={`${logsTotal} entries`}
            actions={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExportLogs("csv")}
                  disabled={exporting !== null}
                  className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="size-3.5" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExportLogs("pdf")}
                  disabled={exporting !== null}
                  className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="size-3.5" /> PDF
                </button>
              </div>
            }
          >
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground pointer-events-none" />
              <Input
                className="pl-9 h-10 text-xs w-full bg-card border-border"
                placeholder="Search by date…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPages((p) => ({ ...p, logs: 1 })); }}
              />
            </div>
            <div className="bg-card border border-border rounded-md overflow-hidden">
              {logsLoading2 ? (
                <div className="space-y-2 p-4"><Skeleton height={36} count={4} /></div>
              ) : selectedLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No entries found for this member.</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {selectedLogs.map((l) => {
                    const weekend = isWeekend(l.log_date);
                    const isOff = l.is_off_day;
                    const total = totalForLog(l);
                    return (
                      <div key={l.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="tabular-nums text-xs font-medium min-w-[120px]">
                          <div className="flex flex-col leading-tight">
                            <span>{formatTableDate(l.log_date)}</span>
                            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-heading">{formatDayName(l.log_date)}</span>
                          </div>
                        </div>
                        {isOff ? (
                          <span className="text-xs font-medium text-muted-foreground/60 tracking-wide uppercase font-heading flex items-center gap-1.5">
                            <BedDouble className="size-3.5" /> {weekend ? "Weekend" : "Off Day"}
                          </span>
                        ) : (
                          <>
                            <div className="flex-1 flex flex-wrap gap-1.5">
                              {selectedCategories.map((c) => {
                                const v = (l.counts ?? {})[c.key] ?? 0;
                                return v > 0 ? (
                                  <span key={c.key} className="text-xs font-medium px-2 py-0.5 rounded-full tabular-nums bg-muted/40 border border-border/40">{c.short} · {v}</span>
                                ) : null;
                              })}
                            </div>
                            <span className="text-base font-bold tabular-nums text-primary">{total}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {logsTotal > 30 && (
              <Pagination
                page={pages.logs}
                totalPages={Math.ceil(logsTotal / 30)}
                pageNumbers={pageNumbersArr(Math.ceil(logsTotal / 30), pages.logs)}
                onPageChange={(p) => setPages((prev) => ({ ...prev, logs: p }))}
              />
            )}
          </SectionCard>
        )}

        {tab === "faxed-back" && (
          <SectionCard
            title="Faxed Back"
            sub={`${faxedBackTotal} docs`}
            actions={
              <button
                type="button"
                onClick={handleExportFaxedBack}
                disabled={exporting !== null}
                title="Export all matching results (current search) as CSV"
                className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="size-3.5" /> CSV
              </button>
            }
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground pointer-events-none" />
              <Input
                className="pl-9 h-10 text-xs w-full bg-card border-border"
                placeholder="Search file, patient, notes…"
                value={faxFilters.search}
                onChange={(e) => { setFaxFilters((f) => ({ ...f, search: e.target.value })); setPages((p) => ({ ...p, faxedBack: 1 })); }}
              />
            </div>
            {faxedBackLoading ? (
              <div className="space-y-2"><Skeleton height={40} count={4} /></div>
            ) : selectedFaxedBack.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No faxed-back docs.</div>
            ) : (
              <>
                <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                        <th className="px-4 py-2.5 font-medium">File</th>
                        <th className="px-3 py-2.5 font-medium">Patient</th>
                        <th className="px-3 py-2.5 font-medium">Worked On</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {selectedFaxedBack.map((d) => (
                        <tr key={d.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium truncate max-w-[220px]">
                            <span className="inline-flex items-center">
                              <img src="/pdf.png" alt="" className="size-4 shrink-0 object-contain mr-1.5" />
                              <Highlight text={d.file_name} query={faxFilters.search} />
                              {!/\.pdf$/i.test(d.file_name) && <span>.pdf</span>}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 truncate max-w-[160px]">{d.patient_name ? <Highlight text={d.patient_name} query={faxFilters.search} /> : "—"}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatTableDate(d.worked_on)}</td>
                          <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5"><FBStatusIcon status={d.status} />{d.status}</span></td>
                          <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[200px]">{d.notes ? <Highlight text={d.notes} query={faxFilters.search} /> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={pages.faxedBack}
                  totalPages={Math.ceil(faxedBackTotal / 25)}
                  pageNumbers={pageNumbersArr(Math.ceil(faxedBackTotal / 25), pages.faxedBack)}
                  onPageChange={(p) => setPages((prev) => ({ ...prev, faxedBack: p }))}
                  total={faxedBackTotal}
                  pageSize={25}
                />
              </>
            )}
          </SectionCard>
        )}

        {tab === "categories" && (
          <SectionCard title="Categories" sub={`${categoriesTotal} categories`}>
            {categoriesLoading ? (
              <div className="space-y-2"><Skeleton height={40} count={4} /></div>
            ) : selectedCategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No categories.</div>
            ) : (
              <div className="bg-card border border-border rounded-md overflow-hidden">
                <div className="divide-y divide-border/40">
                  {selectedCategories.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 font-mono">{c.key}</span>
                      <span className="text-xs font-semibold">{c.label}</span>
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/40 border border-border/40">{c.short}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">pos {c.position}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {tab === "activity" && (
          <SectionCard title="Audit Log" sub={`${auditTotal} events`}>
            {auditLoading ? (
              <div className="space-y-2"><Skeleton height={40} count={4} /></div>
            ) : selectedAudit.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No activity yet.</div>
            ) : (
              <>
<div className="bg-card border border-border/50 rounded-lg overflow-hidden">
                  <div className="divide-y divide-border/40">
                    {selectedAudit.map((a) => {
                      const dt = formatDateTime(a.created_at);
                      const expanded = expandedAuditId === a.id;
                      const changes = changeRows(a.event, a.details);
                      return (
                        <div key={a.id}>
                          <button
                            type="button"
                            onClick={() => setExpandedAuditId(expanded ? null : a.id)}
                            className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors cursor-pointer"
                          >
                            <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {dt ? `${dt.date} · ${dt.time}` : "—"}
                              </p>
                              <p className="text-sm font-medium text-foreground">
                                {describeEvent(a.event, a.details, (id) => {
                                  const p = profiles.find((pr) => pr.id === id);
                                  return p ? `${p.first_name} ${p.last_name}`.trim() : null;
                                })}
                              </p>
                            </div>
                            <ChevronRight className={`size-4 text-muted-foreground shrink-0 mt-1 transition-transform ${expanded ? "rotate-90" : ""}`} />
                          </button>
                          {expanded && (
                            <div className="px-4 pb-3 pl-10 space-y-1.5">
                              {changes.length === 0 ? (
                                <p className="text-xs text-muted-foreground/70 italic">No field details recorded for this event.</p>
                              ) : (
                                changes.map((c, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
                                    <span className="text-muted-foreground">{c.label}:</span>
                                    <span className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-muted-foreground line-through decoration-destructive/60">{c.before}</span>
                                    <span className="text-muted-foreground/60">→</span>
                                    <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-medium">{c.after}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Pagination
                  page={pages.activity}
                  totalPages={Math.ceil(auditTotal / 25)}
                  pageNumbers={pageNumbersArr(Math.ceil(auditTotal / 25), pages.activity)}
                  onPageChange={(p) => setPages((prev) => ({ ...prev, activity: p }))}
                  total={auditTotal}
                  pageSize={25}
                />
              </>
            )}
          </SectionCard>
        )}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This permanently deletes the user's account, their profile, all daily logs, categories, trackers, and audit history.
              </span>
              <span className="block text-destructive font-medium">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/95 text-destructive-foreground disabled:opacity-50"
              disabled={deleteUser.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteUser.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {deleteUser.isPending ? "Deleting…" : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

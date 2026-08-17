import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  useTeamProfiles,
  useTeamDailyLogs,
  useSetUserRole,
  useTeamFaxedBackDocs,
  useTeamCategories,
  useTeamAuditLogs,
} from "@/hooks/useTeamData";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useProfile } from "@/hooks/useProfile";
import { isoDate, totalForLog, formatTableDate, formatDayName, isWeekend, type DailyLog } from "@/types/log";
import {
  Users, FileText, CalendarCheck, TrendingUp, ChevronRight, Search, ArrowLeft, BedDouble,
  Shield, FileCheck2, Tags, History, LayoutGrid, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FigHeader, EmptyState } from "@/components/ar/industrial";
import { labelFor, displayStatus, overallClasses, formatDateTime } from "@/components/ar/tracker/tracker-helpers";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border/80 rounded-lg p-3 sm:p-4 flex items-center gap-3">
      <div className="size-8 sm:size-9 rounded-lg border border-border/60 grid place-items-center text-primary/60 bg-primary/[0.04] shrink-0">
        <Icon className="size-4 sm:size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-foreground uppercase tracking-wider truncate">{label}</p>
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

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <FigHeader title={title} sub={sub} />
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
  const { data: faxedBack = [], isLoading: faxedBackLoading } = useTeamFaxedBackDocs();
  const { data: teamCategories = [], isLoading: categoriesLoading } = useTeamCategories();
  const { data: auditLogs = [], isLoading: auditLoading } = useTeamAuditLogs();
  const isAdmin = useIsAdmin();
  const { isPending: profilePending } = useProfile();
  const setRole = useSetUserRole();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

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
  const selectedLogs = selectedUserId ? (logsByUser.get(selectedUserId) ?? []) : [];
  const selectedFaxedBack = selectedUserId ? faxedBack.filter((d) => d.created_by === selectedUserId) : [];
  const selectedCategories = selectedUserId ? teamCategories.filter((c) => c.user_id === selectedUserId) : [];
  const selectedAudit = selectedUserId ? auditLogs.filter((a) => a.user_id === selectedUserId) : [];

  const today = isoDate();
  const todayEntry = selectedLogs.find((l) => l.log_date === today);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return selectedLogs;
    const q = search.trim().toLowerCase();
    return selectedLogs.filter(
      (l) => l.log_date.includes(q) || formatTableDate(l.log_date).toLowerCase().includes(q),
    );
  }, [selectedLogs, search]);

  const isMe = selectedUserId === user?.id;

  if (loading || profilePending) return null;
  if (!isAdmin) return <Navigate to="/log" replace />;

  // ── Team grid ──────────────────────────────────────────────────────────────
  if (!selectedUserId) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 animate-fade-in">
        <div className="w-full space-y-6">
          <FigHeader title="Admin Panel" sub={`${profiles.length} members`} />

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border border-border/80 rounded-lg p-5 space-y-3">
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
                  onClick={() => { setSelectedUserId(m.id); setTab("overview"); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedUserId(m.id);
                      setTab("overview");
                    }
                  }}
                  className="bg-card border border-border/80 rounded-lg p-5 text-left hover:border-primary/30 hover:bg-muted/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-9 rounded-full bg-primary/10 border border-primary/20 grid place-items-center text-sm font-bold text-primary shrink-0">
                      {(m.first_name?.[0] ?? "").toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-2">
                        <span className="truncate">{m.first_name} {m.last_name}</span>
                        {m.role === "admin" && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            <Shield className="size-3" /> Admin
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{m.logCount} log entries</p>
                    </div>
                    {m.id !== user?.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRole.mutate({ targetUserId: m.id, role: m.role === "admin" ? "user" : "admin", prevRole: m.role });
                        }}
                        disabled={setRole.isPending}
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border border-border/60 hover:border-primary/40 hover:text-primary disabled:opacity-40 transition-colors"
                        aria-label={m.role === "admin" ? `Revoke admin from ${m.first_name}` : `Make ${m.first_name} admin`}
                      >
                        {setRole.isPending ? "…" : m.role === "admin" ? "Revoke" : "Make admin"}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center gap-1"><CalendarCheck className="size-3" /> Days Worked</p>
                      <p className="text-base font-bold tabular-nums">{m.daysWorked}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center gap-1"><FileText className="size-3" /> Documents</p>
                      <p className="text-base font-bold tabular-nums">{m.totalDocs}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center gap-1"><TrendingUp className="size-3" /> Daily Avg</p>
                      <p className="text-base font-bold tabular-nums">{m.avg}</p>
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
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => { setSelectedUserId(null); setSearch(""); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 flex items-center gap-1"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/10 border border-primary/20 grid place-items-center text-sm font-bold text-primary">
              {((selectedMember?.first_name?.[0] ?? "") + (selectedMember?.last_name?.[0] ?? "")).toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                {selectedMember?.first_name} {selectedMember?.last_name}
                {selectedMember?.role === "admin" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    <Shield className="size-3" /> Admin
                  </span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">{isMe ? "You" : "Team member"}</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-xs font-semibold border transition-colors",
                tab === t.id
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-foreground/20",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <StatCard icon={CalendarCheck} label="Days Worked" value={selectedMember?.daysWorked ?? 0} />
              <StatCard icon={FileText} label="Total Documents" value={selectedMember?.totalDocs ?? 0} />
              <StatCard icon={TrendingUp} label="Daily Average" value={selectedMember?.avg ?? 0} />
              <StatCard icon={ChevronRight} label="Today" value={!todayEntry || todayEntry.is_off_day ? 0 : totalForLog(todayEntry)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <StatCard icon={FileCheck2} label="Faxed Back" value={selectedFaxedBack.length} />
              <StatCard icon={Tags} label="Categories" value={selectedCategories.length} />
              <StatCard icon={History} label="Audit Events" value={selectedAudit.length} />
            </div>
            <div className="bg-card border border-border/80 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
              <p><span className="text-foreground font-semibold">Role:</span> {selectedMember?.role === "admin" ? "Admin" : "User"}</p>
              <p><span className="text-foreground font-semibold">Daily goal:</span> {selectedMember?.daily_goal ?? "Not set"}</p>
              <p><span className="text-foreground font-semibold">Audit events:</span> {selectedAudit.length}</p>
            </div>
          </>
        )}

        {tab === "logs" && (
          <SectionCard title="Daily Logs" sub={`${selectedLogs.length} entries`}>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground pointer-events-none" />
              <Input
                className="pl-9 h-10 text-xs w-full bg-card border-border"
                placeholder="Search by date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="bg-card border border-border rounded-md overflow-hidden">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No entries found for this member.</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {[...filteredLogs].sort((a, b) => b.log_date.localeCompare(a.log_date)).map((l) => {
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
          </SectionCard>
        )}

        {tab === "faxed-back" && (
          <SectionCard title="Faxed Back" sub={`${selectedFaxedBack.length} docs`}>
            {faxedBackLoading ? (
              <div className="space-y-2"><Skeleton height={40} count={4} /></div>
            ) : selectedFaxedBack.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No faxed-back docs.</div>
            ) : (
              <div className="bg-card border border-border rounded-md overflow-x-auto">
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
                        <td className="px-4 py-2.5 font-medium truncate max-w-[220px]">{d.file_name}</td>
                        <td className="px-3 py-2.5 truncate max-w-[160px]">{d.patient_name || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{formatTableDate(d.worked_on)}</td>
                        <td className="px-3 py-2.5">{d.status}</td>
                        <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[200px]">{d.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {tab === "categories" && (
          <SectionCard title="Categories" sub={`${selectedCategories.length} categories`}>
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
          <SectionCard title="Audit Log" sub={`${selectedAudit.length} events`}>
            {auditLoading ? (
              <div className="space-y-2"><Skeleton height={40} count={4} /></div>
            ) : selectedAudit.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No activity yet.</div>
            ) : (
              <div className="bg-card border border-border rounded-md overflow-hidden">
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
            )}
          </SectionCard>
        )}
      </div>
    </main>
  );
}

import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTeamProfiles, useTeamDailyLogs } from "@/hooks/useTeamData";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { isoDate, totalForLog, formatTableDate, formatDayName, isWeekend, type DailyLog } from "@/types/log";
import { Users, FileText, CalendarCheck, TrendingUp, ChevronRight, Search, ArrowLeft, BedDouble } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FigHeader, EmptyState } from "@/components/ar/industrial";
import Skeleton from "react-loading-skeleton";

const TEAM_VIEWER_ID = "eaa58c9a-a0b8-4c00-9399-0e16fe8600ee";

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

export default function TeamPage() {
  const { user, loading } = useAuth();
  const { data: profiles = [], isLoading: profilesLoading } = useTeamProfiles();
  const { data: allLogs = [], isLoading: logsLoading } = useTeamDailyLogs();
  const { data: categories = [] } = useCategories();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  if (loading) return null;
  if (user?.id !== TEAM_VIEWER_ID) return <Navigate to="/log" replace />;

  // If no user is selected, show the team grid
  if (!selectedUserId) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 animate-fade-in">
        <div className="w-full space-y-6">
          <FigHeader title="Team" sub={`${profiles.length} members`} />

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
                <button
                  key={m.id}
                  onClick={() => setSelectedUserId(m.id)}
                  className="bg-card border border-border/80 rounded-lg p-5 text-left hover:border-primary/30 hover:bg-muted/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-9 rounded-full bg-primary/10 border border-primary/20 grid place-items-center text-sm font-bold text-primary shrink-0">
                      {(m.first_name?.[0] ?? "").toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{m.first_name} {m.last_name}</p>
                      <p className="text-[11px] text-muted-foreground">{m.logCount} entries</p>
                    </div>
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
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Drill-down view for a specific user
  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 animate-fade-in">
      <div className="w-full space-y-6">
        <div className="flex items-center gap-4">
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
              <p className="text-sm font-semibold">{selectedMember?.first_name} {selectedMember?.last_name}</p>
              <p className="text-[11px] text-muted-foreground">{isMe ? "You" : "Team member"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard icon={CalendarCheck} label="Days Worked" value={selectedMember?.daysWorked ?? 0} />
          <StatCard icon={FileText} label="Total Documents" value={selectedMember?.totalDocs ?? 0} />
          <StatCard icon={TrendingUp} label="Daily Average" value={selectedMember?.avg ?? 0} />
          <StatCard icon={ChevronRight} label="Today" value={!todayEntry || todayEntry.is_off_day ? 0 : totalForLog(todayEntry)} />
        </div>

        <div className="space-y-3">
          <FigHeader title="Logs" sub={`${selectedLogs.length} entries`} />
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
                {filteredLogs.sort((a, b) => b.log_date.localeCompare(a.log_date)).map((l) => {
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
                            {categories.map((c) => {
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
        </div>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DayEntrySheet } from "@/components/ar/DayEntrySheet";
import { Charts } from "@/components/ar/Charts";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { isoDate, totalForLog, type DailyLog } from "@/types/log";
import { Plus, BarChart2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ar/PageHeader";

const CAT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(160 70% 60%)",
  "hsl(280 70% 65%)",
  "hsl(20 85% 60%)",
];

const Index = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: categories = [] } = useCategories();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyLog | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditing(null);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const getVal = (log: DailyLog, key: string): number => {
    if (key in log) return (log as Record<string, number>)[key] || 0;
    return ((log.extra as Record<string, number>) ?? {})[key] || 0;
  };

  const stats = useMemo(() => {
    const today = isoDate();
    const working = logs.filter((l) => !l.is_off_day);
    const todayLog = logs.find((l) => l.log_date === today);
    const todayTotal = todayLog ? totalForLog(todayLog) : 0;
    const categoryTotals = categories.map((c) => ({
      key: c.key,
      label: c.label,
      value: working.reduce((s, l) => s + getVal(l, c.key), 0),
    }));
    return { todayLog, todayTotal, categoryTotals, workingCount: working.length };
  }, [logs, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const existingDates = useMemo(() => logs.map((l) => l.log_date), [logs]);
  const openNew = () => { setEditing(null); setOpen(true); };

  const isWeekendToday = (() => {
    const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(now);
    return day === "Sat" || day === "Sun";
  })();

  const isEmpty = !isLoading && logs.length === 0;

  return (
    <>
      <PageHeader
        now={now}
        subtitle={
          isWeekendToday ? (
            <span className="text-primary">Enjoy your weekend!</span>
          ) : stats.todayLog ? (
            <span className="text-success">{stats.todayTotal} docs logged today</span>
          ) : undefined
        }
        actions={
          <Button size="sm" className="h-8" onClick={openNew}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Log day</span>
            <kbd className="ml-2 hidden sm:inline-flex text-xs border border-primary-foreground/30 rounded px-1">N</kbd>
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-8">

            {/* ── Per-category breakdown ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">By Category — All Time</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-10" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                    ))
                  : stats.categoryTotals.map((c, i) => (
                      <div key={c.key} className="bg-card border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{c.label}</p>
                        <p className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: CAT_COLORS[i % CAT_COLORS.length] }}>
                          {c.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats.workingCount > 0 ? `~${Math.round(c.value / stats.workingCount)}/day` : "—"}
                        </p>
                      </div>
                    ))
                }
              </div>
            </section>

            {/* ── Charts ── */}
            <section id="trends" className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trends & Breakdown</h2>
              {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`bg-card border border-border rounded-lg p-4 space-y-3 ${i === 0 || i === 3 ? "lg:col-span-2" : ""}`}
                    >
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-52 w-full" />
                    </div>
                  ))}
                </div>
              ) : isEmpty ? (
                <div className="bg-card border border-border rounded-lg flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                  <BarChart2 className="h-12 w-12 opacity-20" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">No data yet</p>
                    <p className="text-xs">Log your first day to see trends and charts here.</p>
                  </div>
                  <Button size="sm" onClick={openNew}>
                    <Plus className="h-4 w-4 mr-1" /> Log your first day
                  </Button>
                </div>
              ) : (
                <Charts logs={logs} />
              )}
            </section>

          </main>

        <DayEntrySheet open={open} onOpenChange={setOpen} editing={editing} existingDates={existingDates} />
    </>
  );
};

export default Index;

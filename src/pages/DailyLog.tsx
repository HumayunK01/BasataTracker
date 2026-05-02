import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DayEntrySheet } from "@/components/ar/DayEntrySheet";
import { DaysTable } from "@/components/ar/DaysTable";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { downloadCSV } from "@/lib/log-utils";
import { isoDate, totalForLog, type DailyLog } from "@/types/log";
import { Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/ar/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

const DailyLogPage = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
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

  const todayLog = useMemo(() => {
    const today = isoDate();
    return logs.find((l) => l.log_date === today) ?? null;
  }, [logs]);

  const existingDates = useMemo(() => logs.map((l) => l.log_date), [logs]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (log: DailyLog) => { setEditing(log); setOpen(true); };

  return (
    <>
      <PageHeader
        now={now}
        subtitle={todayLog ? <span className="text-success">{totalForLog(todayLog)} docs logged today</span> : undefined}
        actions={
          <>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={() => downloadCSV(logs)} disabled={logs.length === 0}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => downloadCSV(logs)} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button size="sm" className="h-8" onClick={openNew}>
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Log day</span>
              <kbd className="ml-2 hidden sm:inline-flex text-[10px] border border-primary-foreground/30 rounded px-1">N</kbd>
            </Button>
          </>
        }
      />
      <main className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 py-4">
            {isLoading ? (
              <div className="flex-1 flex flex-col gap-3 pt-2">
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-8 w-56 ml-auto" />
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8 mx-auto" />
                      <Skeleton className="h-4 w-8 mx-auto" />
                      <Skeleton className="h-4 w-8 mx-auto" />
                      <Skeleton className="h-4 w-8 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <h2 className="font-semibold mb-1">No logs yet</h2>
                  <p className="text-sm text-muted-foreground mb-4">Start by logging your first day of work.</p>
                  <Button onClick={openNew}>
                    <Plus className="h-4 w-4 mr-1" /> Log your first day
                  </Button>
                </div>
              </div>
            ) : (
              <DaysTable logs={logs} onEdit={openEdit} />
            )}
          </main>

        <DayEntrySheet
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          existingDates={existingDates}
        />
    </>
  );
};

export default DailyLogPage;

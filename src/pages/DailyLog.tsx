import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DayEntrySheet } from "@/components/ar/DayEntrySheet";
import { DaysTable } from "@/components/ar/DaysTable";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { useProfile } from "@/hooks/useProfile";
import { downloadCSV, downloadJSON, downloadPDF } from "@/lib/log-utils";
import { isoDate, totalForLog, type DailyLog } from "@/types/log";
import { CalendarDays, Download, FileJson, FileText, FileType, Plus, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/ar/PageHeader";
import Skeleton from "react-loading-skeleton";

const DailyLogPage = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined;
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-10 sm:hidden" disabled={logs.length === 0}>
                  <Download className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex h-8" disabled={logs.length === 0}>
                  <Download className="size-4 mr-1" /> Export <ChevronDown className="size-3 ml-1 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Export all logs</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => downloadCSV(logs, categories, "daily-log.csv")}>
                  <FileText className="size-4 mr-2" /> CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadJSON(logs, categories, "daily-log.json")}>
                  <FileJson className="size-4 mr-2" /> JSON (.json)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadPDF(logs, categories, "daily-log.pdf", { title: "", userName })}>
                  <FileType className="size-4 mr-2" /> PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="h-10 sm:h-8" onClick={openNew}>
              <Plus className="size-5 sm:size-4 sm:mr-1" />
              <span className="hidden sm:inline">Log day</span>
              <kbd className="ml-2 hidden sm:inline-flex text-xs border border-primary-foreground/30 rounded px-1">N</kbd>
            </Button>
          </>
        }
      />
      <main className="flex-1 overflow-hidden flex flex-col px-3 sm:px-6 py-4 sm:py-6">
            {isLoading ? (
              <div className="flex-1 flex flex-col gap-3 pt-2">
                <div className="flex gap-3">
                  <Skeleton width={192} height={32} borderRadius={6} />
                  <Skeleton width={224} height={32} borderRadius={6} />
                </div>
                <div className="bg-card border border-border rounded-md overflow-hidden">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0">
                      <Skeleton width={96} height={16} borderRadius={4} />
                      <Skeleton width={32} height={16} borderRadius={4} />
                      <Skeleton width={32} height={16} borderRadius={4} />
                      <Skeleton width={32} height={16} borderRadius={4} />
                      <Skeleton width={32} height={16} borderRadius={4} />
                    </div>
                  ))}
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <CalendarDays className="size-12 opacity-20" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">No logs yet</p>
                    <p className="text-xs">Start by logging your first day of work.</p>
                  </div>
                  <Button size="sm" onClick={openNew}>
                    <Plus className="size-4 mr-1" /> Log your first day
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

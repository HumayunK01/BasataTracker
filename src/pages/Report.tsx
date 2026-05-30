import { useMemo, useReducer, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { isoDate, formatTableDate, isWeekend, totalForLog, type DailyLog } from "@/types/log";
import { PageHeader } from "@/components/ar/PageHeader";
import { downloadCSV, downloadJSON } from "@/lib/log-utils";
import { Download, FileJson, FileText, ChevronDown, CalendarRange } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { colorForKey } from "@/lib/cat-colors";

// Import modular components
import { ReportStatsGrid } from "@/components/ar/report/ReportStatsGrid";
import { CategoryBreakdown } from "@/components/ar/report/CategoryBreakdown";
import { ReportDayTable } from "@/components/ar/report/ReportDayTable";

const TABLE_PAGE_SIZE = 20;

// ── Date presets ───────────────────────────────────────────────────────────
function getPresetRange(preset: string): { start: string; end: string } {
  const today = new Date();
  const todayIso = isoDate(today);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "this_week") {
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return { start: toIso(monday), end: todayIso };
  }
  if (preset === "last_week") {
    const day = today.getDay();
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    return { start: toIso(lastMonday), end: toIso(lastSunday) };
  }
  if (preset === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toIso(start), end: todayIso };
  }
  if (preset === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toIso(start), end: toIso(end) };
  }
  if (preset === "last_30") {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return { start: toIso(start), end: todayIso };
  }
  if (preset === "last_90") {
    const start = new Date(today);
    start.setDate(today.getDate() - 89);
    return { start: toIso(start), end: todayIso };
  }
  return { start: todayIso, end: todayIso };
}

const PRESETS = [
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_30", label: "Last 30 Days" },
  { id: "last_90", label: "Last 90 Days" },
];

// ── Reducer ────────────────────────────────────────────────────────────────
interface ReportFilter {
  startDate: string;
  endDate: string;
  activePreset: string;
  tablePage: number;
}

type ReportAction =
  | { type: "preset"; id: string; start: string; end: string }
  | { type: "set_start"; v: string }
  | { type: "set_end"; v: string }
  | { type: "set_page"; p: number };

function reportReducer(s: ReportFilter, a: ReportAction): ReportFilter {
  switch (a.type) {
    case "preset": return { startDate: a.start, endDate: a.end, activePreset: a.id, tablePage: 1 };
    case "set_start": return { ...s, startDate: a.v, activePreset: "", tablePage: 1 };
    case "set_end": return { ...s, endDate: a.v, activePreset: "", tablePage: 1 };
    case "set_page": return { ...s, tablePage: a.p };
    default: return s;
  }
}

// ── Page ───────────────────────────────────────────────────────────────────
const ReportPage = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: categories = [] } = useCategories();
  const [now] = useState(() => new Date());

  const [filter, filterDispatch] = useReducer(reportReducer, undefined, () => {
    const r = getPresetRange("this_month");
    return { startDate: r.start, endDate: r.end, activePreset: "this_month", tablePage: 1 };
  });
  const { startDate, endDate, activePreset, tablePage } = filter;

  const applyPreset = (id: string) => {
    const range = getPresetRange(id);
    filterDispatch({ type: "preset", id, start: range.start, end: range.end });
  };

  const filtered = useMemo(() => {
    if (!startDate || !endDate) return [];
    return logs
      .filter((l) => l.log_date >= startDate && l.log_date <= endDate)
      .sort((a, b) => b.log_date.localeCompare(a.log_date));
  }, [logs, startDate, endDate]);

  const workingLogs = useMemo(() => filtered.filter((l) => !l.is_off_day), [filtered]);
  const weekendDays = useMemo(() => filtered.filter((l) => l.is_off_day && isWeekend(l.log_date)).length, [filtered]);
  const offDays = filtered.filter((l) => l.is_off_day && !isWeekend(l.log_date)).length;
  const totalDocs = useMemo(() => workingLogs.reduce((s, l) => s + totalForLog(l), 0), [workingLogs]);
  const avgPerDay = workingLogs.length ? Math.round(totalDocs / workingLogs.length) : 0;
  const bestDay = useMemo(() => {
    if (!workingLogs.length) return null;
    return workingLogs.reduce((best, l) => totalForLog(l) > totalForLog(best) ? l : best, workingLogs[0]);
  }, [workingLogs]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = categories.reduce<{ key: string; label: string; short: string; value: number; color: string }[]>(
      (acc, c) => {
        const value = workingLogs.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0);
        if (value > 0) {
          acc.push({
            key: c.key,
            label: c.label,
            short: c.short,
            value,
            color: c.key.startsWith("#") ? c.key : colorForKey(c.key),
          });
        }
        return acc;
      },
      []
    );
    return breakdown;
  }, [categories, workingLogs]);

  const chartData = useMemo(() =>
    [...workingLogs]
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
      .map((l) => ({ date: formatTableDate(l.log_date), docs: totalForLog(l) })),
    [workingLogs]
  );

  const totalTablePages = Math.ceil(filtered.length / TABLE_PAGE_SIZE);
  const paginatedRows = filtered.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);
  const tablePageNumbers = useMemo(() => {
    if (totalTablePages <= 7) return Array.from({ length: totalTablePages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (tablePage > 3) pages.push("…");
    for (let i = Math.max(2, tablePage - 1); i <= Math.min(totalTablePages - 1, tablePage + 1); i++) pages.push(i);
    if (tablePage < totalTablePages - 2) pages.push("…");
    pages.push(totalTablePages);
    return pages;
  }, [totalTablePages, tablePage]);

  const exportedLogs = useMemo(
    () => [...filtered].sort((a, b) => b.log_date.localeCompare(a.log_date)),
    [filtered]
  );
  const exportFilename = `report-${startDate}-to-${endDate}`;
  const handleExportCSV = () => downloadCSV(exportedLogs, categories, `${exportFilename}.csv`);
  const handleExportJSON = () => downloadJSON(exportedLogs, categories, `${exportFilename}.json`);

  const rangeLabel = startDate && endDate
    ? `${formatTableDate(startDate)} – ${formatTableDate(endDate)}`
    : "Select a date range";

  return (
    <>
      <PageHeader
        now={now}
        subtitle="Report"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-8 sm:hidden shrink-0" disabled={filtered.length === 0}>
                <Download className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex h-8 shrink-0" disabled={filtered.length === 0}>
                <Download className="size-4 mr-1" /> Export <ChevronDown className="size-3 ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 font-[system-ui]">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Export filtered range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="size-4 mr-2" /> CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>
                <FileJson className="size-4 mr-2" /> JSON (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 font-[system-ui]">
        {/* Date range controls */}
        <div className="bg-card border border-border rounded-md p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar snap-x snap-mandatory">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={[
                  "snap-start shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  activePreset === p.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => filterDispatch({ type: "set_start", v: e.target.value })}
                className="w-full sm:w-44 tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => filterDispatch({ type: "set_end", v: e.target.value })}
                className="w-full sm:w-44 tabular-nums"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:pb-2">
              <CalendarRange className="size-3.5 shrink-0" />
              <span className="truncate">{rangeLabel}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-md p-4 space-y-2">
                  <Skeleton width={80} height={12} borderRadius={4} />
                  <Skeleton width={64} height={32} borderRadius={4} />
                  <Skeleton width={96} height={12} borderRadius={4} />
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-md p-4 space-y-3">
              <Skeleton width={144} height={16} borderRadius={4} />
              <Skeleton height={176} borderRadius={6} />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <CalendarRange className="size-10 opacity-20" />
            <p className="text-sm">No logs found for this date range.</p>
          </div>
        ) : (
          <>
            <ReportStatsGrid
              totalDocs={totalDocs}
              filteredCount={filtered.length}
              workingCount={workingLogs.length}
              weekendDays={weekendDays}
              offDays={offDays}
              avgPerDay={avgPerDay}
              bestDay={bestDay}
            />
            <CategoryBreakdown breakdown={categoryBreakdown} totalDocs={totalDocs} chartData={chartData} />
            <ReportDayTable
              filtered={filtered}
              categories={categories}
              workingLogs={workingLogs}
              totalDocs={totalDocs}
              avgPerDay={avgPerDay}
              tablePage={tablePage}
              totalTablePages={totalTablePages}
              tablePageNumbers={tablePageNumbers}
              paginatedRows={paginatedRows}
              onPageChange={(p) => filterDispatch({ type: "set_page", p })}
            />
          </>
        )}
      </main>
    </>
  );
};

export default ReportPage;

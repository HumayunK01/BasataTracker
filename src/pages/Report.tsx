import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { isoDate, formatTableDate, isWeekend, totalForLog } from "@/types/log";
import { PageHeader } from "@/components/ar/PageHeader";
import { downloadCSV } from "@/lib/log-utils";
import { Download, BedDouble, TrendingUp, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

const TABLE_PAGE_SIZE = 20;
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { colorForKey } from "@/lib/cat-colors";

const T = {
  container: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "6px",
  },
  text: { fontSize: "12px", color: "hsl(var(--popover-foreground))" },
  axis: { stroke: "hsl(var(--muted-foreground))", fontSize: 12 } as const,
  grid: "hsl(var(--border))",
};

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

const ReportPage = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: categories = [] } = useCategories();
  const [now] = useState(() => new Date());

  const defaultRange = getPresetRange("this_month");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [activePreset, setActivePreset] = useState<string>("this_month");
  const [tablePage, setTablePage] = useState(1);

  const applyPreset = (id: string) => {
    const range = getPresetRange(id);
    setStartDate(range.start);
    setEndDate(range.end);
    setActivePreset(id);
    setTablePage(1);
  };

  const onStartChange = (v: string) => { setStartDate(v); setActivePreset(""); setTablePage(1); };
  const onEndChange = (v: string) => { setEndDate(v); setActivePreset(""); setTablePage(1); };

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

  const categoryBreakdown = useMemo(() =>
    categories.map((c) => ({
      key: c.key,
      label: c.label,
      short: c.short,
      value: workingLogs.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0),
      color: colorForKey(c.key),
    })).filter((c) => c.value > 0),
    [categories, workingLogs],
  );

  const chartData = useMemo(() =>
    [...workingLogs]
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
      .map((l) => ({ date: formatTableDate(l.log_date), docs: totalForLog(l) })),
    [workingLogs],
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

  const handleExport = () => {
    const sorted = [...filtered].sort((a, b) => b.log_date.localeCompare(a.log_date));
    downloadCSV(sorted, categories, `report-${startDate}-to-${endDate}.csv`);
  };

  const rangeLabel = startDate && endDate
    ? `${formatTableDate(startDate)} – ${formatTableDate(endDate)}`
    : "Select a date range";

  return (
    <>
      <PageHeader
        now={now}
        subtitle="Report"
        actions={
          <>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden shrink-0" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex shrink-0" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </>
        }
      />
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Date range controls */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
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
              <Input type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)} className="w-full sm:w-44 tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End date</Label>
              <Input type="date" value={endDate} onChange={(e) => onEndChange(e.target.value)} className="w-full sm:w-44 tabular-nums" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:pb-2">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{rangeLabel}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-44 w-full" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <CalendarRange className="h-10 w-10 opacity-20" />
            <p className="text-sm">No logs found for this date range.</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Docs</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums text-primary mt-1">{totalDocs}</p>
                <p className="text-xs text-muted-foreground mt-1">{filtered.length} days logged</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Working Days</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums mt-1">{workingLogs.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{weekendDays} weekends · {offDays} off days</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg / Day</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums text-info mt-1">{avgPerDay}</p>
                <p className="text-xs text-muted-foreground mt-1">docs per working day</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Best Day</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums text-warning mt-1">
                  {bestDay ? totalForLog(bestDay) : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bestDay ? formatTableDate(bestDay.log_date) : "no data"}
                </p>
              </div>
            </div>

            {/* Category breakdown + bar chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h2 className="text-sm font-medium">By Category</h2>
                <div className="space-y-2">
                  {categoryBreakdown.map((c) => {
                    const pct = totalDocs > 0 ? Math.round((c.value / totalDocs) * 100) : 0;
                    return (
                      <div key={c.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="text-muted-foreground">{c.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums" style={{ color: c.color }}>{c.value}</span>
                            <span className="text-muted-foreground/60 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-medium mb-3">
                  Daily docs
                  <TrendingUp className="inline h-3.5 w-3.5 ml-1.5 text-muted-foreground" />
                </h2>
                <div className="h-44 sm:h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={chartData.length > 20 ? 6 : chartData.length > 10 ? 10 : 18}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
                      <XAxis
                        dataKey="date"
                        {...T.axis}
                        tickFormatter={(v) => { const p = v.split("/"); return `${p[0]}/${p[1]}`; }}
                        interval={chartData.length > 20 ? Math.floor(chartData.length / 10) : 0}
                      />
                      <YAxis {...T.axis} allowDecimals={false} />
                      <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} cursor={{ fill: "hsl(var(--accent))" }} />
                      <Bar dataKey="docs" name="Documents" radius={[3, 3, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={i === chartData.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.5)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Day-by-day table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-medium">Day-by-Day Breakdown</h2>
                <span className="text-xs text-muted-foreground sm:hidden">← scroll →</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-medium text-xs w-[120px]">Date</TableHead>
                      {categories.map((c) => (
                        <TableHead key={c.key} className="font-medium text-xs text-center w-[72px]">
                          <span style={{ color: colorForKey(c.key) }}>{c.short}</span>
                        </TableHead>
                      ))}
                      <TableHead className="font-medium text-xs text-center w-[72px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((l) => {
                      const rowTotal = totalForLog(l);
                      return l.is_off_day ? (
                        <TableRow key={l.id} className="border-b border-border/50 last:border-0 bg-muted/20">
                          <TableCell className="tabular-nums text-sm font-medium py-2.5 text-muted-foreground">
                            {formatTableDate(l.log_date)}
                          </TableCell>
                          <TableCell colSpan={categories.length + 1} className="py-2.5">
                            <div className="flex items-center gap-1.5">
                              <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                                {isWeekend(l.log_date) ? "Weekend" : "Off Day"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={l.id} className="border-b border-border/50 last:border-0">
                          <TableCell className="tabular-nums text-sm font-medium py-2.5">
                            {formatTableDate(l.log_date)}
                          </TableCell>
                          {categories.map((c) => {
                            const v = (l.counts ?? {})[c.key] ?? 0;
                            return (
                              <TableCell key={c.key} className="text-center tabular-nums text-sm py-2.5">
                                {v > 0 ? (
                                  <span className="font-medium" style={{ color: colorForKey(c.key) }}>{v}</span>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center tabular-nums py-2.5">
                            <span className="font-bold text-sm">{rowTotal}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalTablePages > 1 && (
                <div className="border-t border-border px-4 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTablePage((p) => Math.max(1, p - 1))} disabled={tablePage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {tablePageNumbers.map((p, i) =>
                      p === "…" ? (
                        <span key={`e-${i}`} className="w-9 text-center text-xs text-muted-foreground">…</span>
                      ) : (
                        <Button key={p} variant={tablePage === p ? "default" : "ghost"} size="icon" className="h-9 w-9 text-xs" onClick={() => setTablePage(p as number)}>
                          {p}
                        </Button>
                      )
                    )}
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))} disabled={tablePage === totalTablePages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {workingLogs.length > 0 && (
                <div className="border-t border-border px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground bg-muted/20">
                  <span><span className="font-semibold text-foreground">{totalDocs}</span> total docs</span>
                  <span><span className="font-semibold text-foreground">{workingLogs.length}</span> working days</span>
                  <span>Avg <span className="font-semibold text-foreground">{avgPerDay}</span> docs/day</span>
                  {categories.map((c) => {
                    const val = workingLogs.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0);
                    return val > 0 ? (
                      <span key={c.key}>{c.short}: <span className="font-semibold text-foreground">{val}</span></span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
};

export default ReportPage;

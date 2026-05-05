import { useMemo, useState } from "react";
import { isoDate, isWeekend, totalForLog, type DailyLog } from "@/types/log";

interface Props {
  logs: DailyLog[];
}

type Cell = {
  iso: string;
  total: number;
  isOffDay: boolean;   // weekday explicitly marked off (holiday)
  isWeekend: boolean;  // Saturday or Sunday
  isFuture: boolean;
  isToday: boolean;
};

const TOTAL_WEEKS = 53;

function buildGrid(logs: DailyLog[], year: number): { weeks: (Cell | null)[][]; monthTicks: { label: string; col: number }[] } {
  const logMap = new Map<string, DailyLog>();
  for (const l of logs) logMap.set(l.log_date, l);

  const todayIso = isoDate();

  // Jan 1 → Dec 31 of the given year
  const startDate = new Date(`${year}-01-01T12:00:00`);
  const endDate = new Date(`${year}-12-31T12:00:00`);

  const dataCells: Cell[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const iso = isoDate(cur);
    const isFuture = iso > todayIso;
    const weekend = isWeekend(iso);
    const log = logMap.get(iso);
    dataCells.push({
      iso,
      total: log && !log.is_off_day ? totalForLog(log) : 0,
      isOffDay: !isFuture && !weekend && (log?.is_off_day ?? false),
      isWeekend: weekend,
      isFuture,
      isToday: iso === todayIso,
    });
    cur.setDate(cur.getDate() + 1);
  }

  // Pad start so Jan 1 aligns to its day-of-week (Sunday = col 0)
  const firstDow = startDate.getDay();
  const padded: (Cell | null)[] = [...Array(firstDow).fill(null), ...dataCells];

  const dataWeeks: (Cell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    dataWeeks.push(padded.slice(i, i + 7));
  }

  // Pad end to always fill TOTAL_WEEKS columns
  while (dataWeeks.length < TOTAL_WEEKS) {
    dataWeeks.push([null, null, null, null, null, null, null]);
  }

  const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthTicks: { label: string; col: number }[] = [];
  let lastMonth = -1;
  dataWeeks.forEach((week, col) => {
    const firstReal = week.find(Boolean);
    if (!firstReal) return;
    const m = new Date(`${firstReal.iso}T12:00:00`).getMonth();
    if (m !== lastMonth) {
      monthTicks.push({ label: MONTH_LABELS[m], col });
      lastMonth = m;
    }
  });

  return { weeks: dataWeeks, monthTicks };
}

function getIntensity(total: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (total === 0) return 0;
  const pct = total / Math.max(max, 1);
  if (pct <= 0.15) return 1;
  if (pct <= 0.35) return 2;
  if (pct <= 0.65) return 3;
  return 4;
}

const INTENSITY_BG: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted/35",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/65",
  4: "bg-primary",
};

export function ContributionHeatmap({ logs }: Props) {
  const [tooltip, setTooltip] = useState<{
    iso: string; total: number; isOffDay: boolean; isWeekend: boolean;
    isFuture: boolean; isToday: boolean; x: number; y: number;
  } | null>(null);

  const currentYear = new Date().getFullYear();

  const [weeks365, monthTicks365, maxTotal] = useMemo(() => {
    const { weeks, monthTicks } = buildGrid(logs, currentYear);
    const allCells = weeks.flat().filter(Boolean) as Cell[];
    const maxTotal = Math.max(...allCells.filter((c) => !c.isFuture).map((c) => c.total), 1);
    return [weeks, monthTicks, maxTotal] as const;
  }, [logs, currentYear]);

  // Mobile: last 16 weeks ending today
  const [weeksMobile, monthTicksMobile] = useMemo(() => {
    const { weeks, monthTicks } = buildGrid(logs, currentYear);
    const todayIso = isoDate();
    const todayCol = weeks.findIndex((week) => week.some((c) => c && c.iso === todayIso));
    const end = todayCol >= 0 ? todayCol : weeks.length - 1;
    const start = Math.max(0, end - 15); // 16 weeks
    return [
      weeks.slice(start, end + 1),
      monthTicks.filter((t) => t.col >= start && t.col <= end).map((t) => ({ ...t, col: t.col - start })),
    ] as const;
  }, [logs, currentYear]);

  function renderGrid(weeks: (Cell | null)[][], monthTicks: { label: string; col: number }[]) {
    return (
      <div className="w-full">
        {/* Month labels */}
        <div className="flex w-full mb-1">
          {weeks.map((_, col) => {
            const tick = monthTicks.find((t) => t.col === col);
            return (
              <div key={col} className="flex-1 min-w-0 overflow-hidden">
                {tick && (
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap select-none">
                    {tick.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Cell columns */}
        <div className="flex w-full">
          {weeks.map((week, col) => (
            <div key={col} className="flex-1 flex flex-col gap-[2px] sm:gap-1 min-w-0 px-[1px] sm:px-[1.5px]">
              {week.map((cell, row) => {
                if (!cell) {
                  return (
                    <div
                      key={row}
                      className="w-full aspect-square rounded-[2px] sm:rounded-sm bg-muted/10 border border-white/[0.05]"
                    />
                  );
                }

                const intensity = getIntensity(cell.total, maxTotal);
                const bgClass = cell.isFuture
                  ? "bg-muted/10 border border-white/[0.05]"
                  : cell.isWeekend
                  ? "bg-slate-500/30 border border-slate-400/20"
                  : cell.isOffDay
                  ? "bg-red-500/40 border border-red-400/20"
                  : `${INTENSITY_BG[intensity]} border border-white/[0.07]`;

                return (
                  <div
                    key={cell.iso}
                    className={[
                      "w-full aspect-square rounded-[2px] sm:rounded-sm transition-all duration-100 cursor-default",
                      bgClass,
                      cell.isToday ? "ring-1 ring-white/30 ring-offset-1 ring-offset-card" : "",
                      !cell.isFuture ? "hover:brightness-125" : "",
                    ].join(" ")}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      // Keep tooltip on screen horizontally
                      const tipX = Math.min(rect.left, window.innerWidth - 180);
                      setTooltip({
                        iso: cell.iso, total: cell.total,
                        isOffDay: cell.isOffDay, isWeekend: cell.isWeekend,
                        isFuture: cell.isFuture, isToday: cell.isToday,
                        x: tipX, y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }


  return (
    <div className="bg-card border border-border rounded-md p-4 sm:p-5 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Activity — {new Date().getFullYear()}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Days worked, off days, and doc volume at a glance</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground select-none flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-slate-500/30 border border-slate-400/20" />
            <span>Weekend</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-red-500/50" />
            <span>Off</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as const).map((i) => (
              <span key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm ${INTENSITY_BG[i]}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Mobile grid: last 16 weeks, fixed small cells, horizontal scroll */}
      <div className="block sm:hidden overflow-x-auto no-scrollbar -mx-1">
        <div style={{ width: `${weeksMobile.length * 18}px` }} className="px-1">
          {/* Month labels */}
          <div className="flex mb-1" style={{ gap: 2 }}>
            {weeksMobile.map((_, col) => {
              const tick = monthTicksMobile.find((t) => t.col === col);
              return (
                <div key={col} style={{ width: 16, flexShrink: 0 }}>
                  {tick && (
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap select-none">
                      {tick.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Rows = days of week (0=Sun … 6=Sat) */}
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <div key={dow} className="flex" style={{ gap: 2, marginBottom: 2 }}>
              {weeksMobile.map((week, col) => {
                const cell = week[dow];
                if (!cell) {
                  return <div key={col} style={{ width: 16, height: 16, flexShrink: 0 }} className="rounded-[3px] bg-muted/10" />;
                }
                const intensity = getIntensity(cell.total, maxTotal);
                const bgClass = cell.isFuture
                  ? "bg-muted/10"
                  : cell.isWeekend
                  ? "bg-slate-500/30"
                  : cell.isOffDay
                  ? "bg-red-500/40"
                  : INTENSITY_BG[intensity];
                return (
                  <div
                    key={cell.iso}
                    style={{ width: 16, height: 16, flexShrink: 0 }}
                    className={[
                      "rounded-[3px] transition-all duration-100",
                      bgClass,
                      cell.isToday ? "ring-1 ring-white/40 ring-offset-1 ring-offset-card" : "",
                    ].join(" ")}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        iso: cell.iso, total: cell.total,
                        isOffDay: cell.isOffDay, isWeekend: cell.isWeekend,
                        isFuture: cell.isFuture, isToday: cell.isToday,
                        x: Math.min(rect.left, window.innerWidth - 180),
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop grid: full year */}
      <div className="hidden sm:block">
        {renderGrid(weeks365, monthTicks365)}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-popover border border-border shadow-lg text-xs whitespace-nowrap"
          style={{ left: tooltip.x, top: Math.max(8, tooltip.y - 44) }}
        >
          <span className="font-semibold">{tooltip.iso}</span>
          {tooltip.isToday && <span className="ml-1.5 text-primary font-medium">· today</span>}
          <span className="text-muted-foreground ml-2">
            {tooltip.isFuture
              ? "—"
              : tooltip.isWeekend
              ? "Weekend"
              : tooltip.isOffDay
              ? "Off day"
              : tooltip.total === 0
              ? "No data"
              : `${tooltip.total} doc${tooltip.total !== 1 ? "s" : ""}`}
          </span>
        </div>
      )}
    </div>
  );
}

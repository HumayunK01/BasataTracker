import { memo, useEffect, useMemo, useRef, useState } from "react";
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

function cellLabel(cell: Cell): string {
  const d = new Date(`${cell.iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  if (cell.isFuture) return `${d}: upcoming`;
  if (cell.isOffDay) return `${d}: off day`;
  if (cell.isWeekend) return `${d}: weekend`;
  return `${d}: ${cell.total} doc${cell.total === 1 ? "" : "s"}`;
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

interface GridProps {
  weeks: (Cell | null)[][];
  monthTicks: { label: string; col: number }[];
  maxTotal: number;
}

function HeatmapGrid({ weeks, monthTicks, maxTotal }: GridProps) {
  return (
    <div className="w-full">
      {/* Month labels */}
      <div className="flex w-full mb-1">
        {weeks.map((_, col) => {
          const tick = monthTicks.find((t) => t.col === col);
          return (
            <div key={`month-${col}`} className="flex-1 min-w-0 overflow-hidden">
              {tick && (
                <span className="text-2xs sm:text-xs text-muted-foreground whitespace-nowrap select-none">
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
          <div key={`col-${col}`} className="flex-1 flex flex-col gap-[2px] sm:gap-1 min-w-0 px-[1px] sm:px-[1.5px]">
            {week.map((cell, row) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${col}-${row}`}
                    className="w-full aspect-square rounded-[2px] sm:rounded-sm bg-muted/10 border border-foreground/[0.05]"
                  />
                );
              }

              const intensity = getIntensity(cell.total, maxTotal);
              const bgClass = cell.isFuture
                ? "bg-muted/10 border border-foreground/[0.05]"
                : cell.isWeekend
                ? "bg-muted-foreground/30 border border-muted-foreground/20"
                : cell.isOffDay
                ? "bg-destructive/40 border border-destructive/20"
                : `${INTENSITY_BG[intensity]} border border-foreground/[0.07]`;

              return (
                <div
                  key={cell.iso}
                  role="img"
                  aria-label={cellLabel(cell)}
                  title={cellLabel(cell)}
                  className={[
                    "w-full aspect-square rounded-[2px] sm:rounded-sm cursor-default transition-transform duration-100 ease-out hover:scale-125 hover:relative hover:z-10 motion-reduce:hover:scale-100",
                    bgClass,
                    cell.isToday ? "ring-1 ring-foreground/40 ring-offset-1 ring-offset-card" : "",
                  ].join(" ")}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export const ContributionHeatmap = memo(function ContributionHeatmap({ logs }: Props) {
  const [currentYear] = useState(() => new Date().getFullYear());

  // Build the full-year grid once; the mobile view slices from the same data.
  const [weeks365, monthTicks365, maxTotal] = useMemo(() => {
    const { weeks, monthTicks } = buildGrid(logs, currentYear);
    const allCells = weeks.flat().filter(Boolean) as Cell[];
    const maxTotal = allCells.reduce((m, c) => c.isFuture ? m : Math.max(m, c.total), 1);
    return [weeks, monthTicks, maxTotal] as const;
  }, [logs, currentYear]);

  // Compact view (below lg): last 26 weeks ending today — sliced from weeks365
  const [weeksMobile, monthTicksMobile] = useMemo(() => {
    const todayIso = isoDate();
    const todayCol = weeks365.findIndex((week) => week.some((c) => c && c.iso === todayIso));
    const end = todayCol >= 0 ? todayCol : weeks365.length - 1;
    const start = Math.max(0, end - 25); // 26 weeks
    return [
      weeks365.slice(start, end + 1),
      monthTicks365.reduce<{ label: string; col: number }[]>((acc, t) => { if (t.col >= start && t.col <= end) acc.push({ ...t, col: t.col - start }); return acc; }, []),
    ] as const;
  }, [weeks365, monthTicks365]);

  // Keep the most recent weeks in view when the compact grid overflows
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeksMobile]);

  return (
    <div className="cv-auto bg-card border border-border rounded-md p-4 sm:p-5 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Activity {currentYear}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Days worked, off days, and doc volume</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground select-none flex-wrap">
          <div className="flex items-center gap-1">
            <span className="size-2.5 sm:w-3 sm:h-3 rounded-sm bg-muted-foreground/30 border border-muted-foreground/20" />
            <span>Weekend</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2.5 sm:w-3 sm:h-3 rounded-sm bg-destructive/50" />
            <span>Off</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span key={`intensity-${level}`} className={`size-2.5 sm:w-3 sm:h-3 rounded-sm ${INTENSITY_BG[level]}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Compact grid (phones + tablets): last 26 weeks, fixed cells, horizontal scroll */}
      <div ref={scrollRef} className="lg:hidden overflow-x-auto no-scrollbar -mx-1">
        <div className="w-max px-1">
          {/* Month labels */}
          <div className="flex gap-0.5 mb-1">
            {weeksMobile.map((_, col) => {
              const tick = monthTicksMobile.find((t) => t.col === col);
              return (
                <div key={`month-m-${col}`} className="w-4 sm:w-5 shrink-0">
                  {tick && (
<span className="text-2xs sm:text-xs text-muted-foreground whitespace-nowrap select-none">
                      {tick.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Rows = days of week (0=Sun … 6=Sat) */}
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <div key={`dow-${dow}`} className="flex gap-0.5 mb-0.5">
              {weeksMobile.map((week, col) => {
                const cell = week[dow];
                if (!cell) {
                  return <div key={`empty-m-${col}-${dow}`} className="size-4 sm:size-5 shrink-0 rounded-[3px] bg-muted/10" />;
                }
                const intensity = getIntensity(cell.total, maxTotal);
                const bgClass = cell.isFuture
                  ? "bg-muted/10"
                  : cell.isWeekend
                  ? "bg-muted-foreground/30"
                  : cell.isOffDay
                  ? "bg-destructive/40"
                  : INTENSITY_BG[intensity];
                return (
                  <div
                    key={cell.iso}
                    role="img"
                    aria-label={cellLabel(cell)}
                    title={cellLabel(cell)}
                    className={[
                      "size-4 sm:size-5 shrink-0 rounded-[3px]",
                      bgClass,
                      cell.isToday ? "ring-1 ring-foreground/50 ring-offset-1 ring-offset-card" : "",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop grid: full year — only at lg+ where 53 columns have room */}
      <div className="hidden lg:block">
        <HeatmapGrid weeks={weeks365} monthTicks={monthTicks365} maxTotal={maxTotal} />
      </div>
    </div>
  );
});

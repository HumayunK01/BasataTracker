import { formatTableDate, totalForLog, type DailyLog } from "@/types/log";
import { FileCheck, CalendarDays, TrendingUp, Award } from "lucide-react";
import { ActivityRing } from "@/components/ar/ActivityRing";

interface StatsGridProps {
  totalDocs: number;
  filteredCount: number;
  workingCount: number;
  weekendDays: number;
  offDays: number;
  avgPerDay: number;
  bestDay: DailyLog | null;
}

export function ReportStatsGrid({
  totalDocs,
  filteredCount,
  workingCount,
  weekendDays,
  offDays,
  avgPerDay,
  bestDay,
}: StatsGridProps) {
  const bestDayVal = bestDay ? totalForLog(bestDay) : 0;
  const docsTarget = Math.max(50, workingCount * 50);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Docs */}
      <div className="bg-card border border-border rounded-md p-3 sm:p-4 flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-heading">Total Documents</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-primary mt-1.5 leading-none">{totalDocs}</p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">{filteredCount} days tracked</p>
        </div>
        <ActivityRing
          value={totalDocs}
          target={docsTarget}
          size={36}
          strokeWidth={3.5}
          color="hsl(var(--primary))"
          className=""
        >
          <FileCheck className="size-3.5 text-primary opacity-80" />
        </ActivityRing>
      </div>

      {/* Working Days */}
      <div className="bg-card border border-border rounded-md p-3 sm:p-4 flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-heading">Working Days</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground/90 mt-1.5 leading-none">{workingCount}</p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            {weekendDays} weekends · {offDays} off days
          </p>
        </div>
        <ActivityRing
          value={workingCount}
          target={filteredCount || 1}
          size={36}
          strokeWidth={3.5}
          color="hsl(var(--foreground))"
          className=""
        >
          <CalendarDays className="size-3.5 text-foreground/80 opacity-80" />
        </ActivityRing>
      </div>

      {/* Avg / Day */}
      <div className="bg-card border border-border rounded-md p-3 sm:p-4 flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-heading">Average / Day</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-info mt-1.5 leading-none">{avgPerDay}</p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">docs per working day</p>
        </div>
        <ActivityRing
          value={avgPerDay}
          target={50}
          size={36}
          strokeWidth={3.5}
          color="hsl(var(--info))"
          className=""
        >
          <TrendingUp className="size-3.5 text-info opacity-80" />
        </ActivityRing>
      </div>

      {/* Best Day */}
      <div className="bg-card border border-border rounded-md p-3 sm:p-4 flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-heading">Best Day</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-warning mt-1.5 leading-none">
            {bestDay ? totalForLog(bestDay) : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            {bestDay ? formatTableDate(bestDay.log_date) : "No logs recorded"}
          </p>
        </div>
        <ActivityRing
          value={bestDayVal}
          target={60}
          size={36}
          strokeWidth={3.5}
          color="hsl(var(--warning))"
          className=""
        >
          <Award className="size-3.5 text-warning opacity-80" />
        </ActivityRing>
      </div>
    </div>
  );
}


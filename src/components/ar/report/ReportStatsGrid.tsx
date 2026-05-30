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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 font-[system-ui]">
      {/* Total Docs */}
      <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 hover:shadow-md hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 group flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Total Documents</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-primary mt-1.5 leading-none">{totalDocs}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">{filteredCount} days tracked</p>
        </div>
        <ActivityRing
          value={totalDocs}
          target={docsTarget}
          size={36}
          strokeWidth={3.5}
          color="hsl(var(--primary))"
          className="group-hover:scale-105 transition-transform duration-300"
        >
          <FileCheck className="size-3.5 text-primary opacity-80" />
        </ActivityRing>
      </div>

      {/* Working Days */}
      <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 hover:shadow-md hover:shadow-foreground/5 hover:border-foreground/20 hover:-translate-y-0.5 transition-all duration-300 group flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Working Days</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground/90 mt-1.5 leading-none">{workingCount}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            {weekendDays} weekends · {offDays} off days
          </p>
        </div>
        <ActivityRing
          value={workingCount}
          target={filteredCount || 1}
          size={36}
          strokeWidth={3.5}
          color="hsl(var(--foreground))"
          className="group-hover:scale-105 transition-transform duration-300"
        >
          <CalendarDays className="size-3.5 text-foreground/80 opacity-80" />
        </ActivityRing>
      </div>

      {/* Avg / Day */}
      <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 hover:shadow-md hover:shadow-info/5 hover:border-info/30 hover:-translate-y-0.5 transition-all duration-300 group flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Average / Day</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-info mt-1.5 leading-none">{avgPerDay}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">docs per working day</p>
        </div>
        <ActivityRing
          value={avgPerDay}
          target={50}
          size={36}
          strokeWidth={3.5}
          color="hsl(var(--info))"
          className="group-hover:scale-105 transition-transform duration-300"
        >
          <TrendingUp className="size-3.5 text-info opacity-80" />
        </ActivityRing>
      </div>

      {/* Best Day */}
      <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 hover:shadow-md hover:shadow-warning/5 hover:border-warning/30 hover:-translate-y-0.5 transition-all duration-300 group flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Best Day</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-warning mt-1.5 leading-none">
            {bestDay ? totalForLog(bestDay) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            {bestDay ? formatTableDate(bestDay.log_date) : "No logs recorded"}
          </p>
        </div>
        <ActivityRing
          value={bestDayVal}
          target={60}
          size={36}
          strokeWidth={3.5}
          color="hsl(var(--warning))"
          className="group-hover:scale-105 transition-transform duration-300"
        >
          <Award className="size-3.5 text-warning opacity-80" />
        </ActivityRing>
      </div>
    </div>
  );
}


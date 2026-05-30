import { formatTableDate, totalForLog, type DailyLog } from "@/types/log";
import { FileCheck, CalendarDays, TrendingUp, Award } from "lucide-react";

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
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 font-[system-ui]">
      {/* Total Docs */}
      <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 hover:shadow-md hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 group flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Total Documents</p>
          <p className="text-2xl sm:text-3xl font-black tabular-nums text-primary mt-1.5 leading-none">{totalDocs}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">{filteredCount} days tracked</p>
        </div>
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
          <FileCheck className="size-4 text-primary" />
        </div>
      </div>

      {/* Working Days */}
      <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 hover:shadow-md hover:shadow-foreground/5 hover:border-foreground/20 hover:-translate-y-0.5 transition-all duration-300 group flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Working Days</p>
          <p className="text-2xl sm:text-3xl font-black tabular-nums text-foreground/90 mt-1.5 leading-none">{workingCount}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            {weekendDays} weekends · {offDays} off days
          </p>
        </div>
        <div className="size-8 rounded-lg bg-foreground/5 border border-border/40 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-foreground/10 transition-all">
          <CalendarDays className="size-4 text-foreground/80" />
        </div>
      </div>

      {/* Avg / Day */}
      <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 hover:shadow-md hover:shadow-info/5 hover:border-info/30 hover:-translate-y-0.5 transition-all duration-300 group flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Average / Day</p>
          <p className="text-2xl sm:text-3xl font-black tabular-nums text-info mt-1.5 leading-none">{avgPerDay}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">docs per working day</p>
        </div>
        <div className="size-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-info/20 transition-all">
          <TrendingUp className="size-4 text-info" />
        </div>
      </div>

      {/* Best Day */}
      <div className="bg-card/75 backdrop-blur-md border border-border/60 rounded-xl p-4 sm:p-5 hover:shadow-md hover:shadow-warning/5 hover:border-warning/30 hover:-translate-y-0.5 transition-all duration-300 group flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Best Day</p>
          <p className="text-2xl sm:text-3xl font-black tabular-nums text-warning mt-1.5 leading-none">
            {bestDay ? totalForLog(bestDay) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            {bestDay ? formatTableDate(bestDay.log_date) : "No logs recorded"}
          </p>
        </div>
        <div className="size-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-warning/20 transition-all">
          <Award className="size-4 text-warning" />
        </div>
      </div>
    </div>
  );
}

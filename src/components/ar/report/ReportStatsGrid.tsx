import { formatTableDate, totalForLog, type DailyLog } from "@/types/log";
import { FileCheck, CalendarDays, TrendingUp, Award } from "lucide-react";
import { ActivityRing } from "@/components/ar/ActivityRing";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

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
  const animTotal = useAnimatedNumber(totalDocs);
  const animWorking = useAnimatedNumber(workingCount);
  const animAvg = useAnimatedNumber(avgPerDay);
  const animBest = useAnimatedNumber(bestDayVal);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Docs */}
      <div className="bg-primary/[0.04] border border-primary/10 rounded-lg p-4 sm:p-5 flex items-start justify-between">
        <div className="space-y-1.5 min-w-0 truncate">
          <p className="text-xs text-primary uppercase tracking-wide font-heading font-semibold truncate">Total Documents</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-primary mt-1 leading-none">{animTotal}</p>
          <p className="text-xs text-foreground font-medium truncate">{filteredCount} days tracked</p>
        </div>
        <ActivityRing
          value={totalDocs}
          target={docsTarget}
          size={28}
          strokeWidth={3}
          color="hsl(var(--primary))"
          className="mt-1 shrink-0"
        >
          <FileCheck className="size-3 text-primary opacity-80" />
        </ActivityRing>
      </div>

      {/* Working Days */}
      <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 flex items-start justify-between">
        <div className="space-y-1.5 min-w-0 truncate">
          <p className="text-xs text-foreground uppercase tracking-wide font-heading truncate">Working Days</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground/90 mt-1 leading-none">{animWorking}</p>
          <p className="text-xs text-foreground font-medium truncate">
            {weekendDays} weekends · {offDays} off days
          </p>
        </div>
        <ActivityRing
          value={workingCount}
          target={filteredCount || 1}
          size={28}
          strokeWidth={3}
          color="hsl(var(--foreground))"
          className="mt-1 shrink-0"
        >
          <CalendarDays className="size-3 text-foreground/80 opacity-80" />
        </ActivityRing>
      </div>

      {/* Avg / Day */}
      <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 flex items-start justify-between">
        <div className="space-y-1.5 min-w-0 truncate">
          <p className="text-xs text-foreground uppercase tracking-wide font-heading truncate">Average / Day</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-info mt-1 leading-none">{animAvg}</p>
          <p className="text-xs text-foreground font-medium truncate">docs per working day</p>
        </div>
        <ActivityRing
          value={avgPerDay}
          target={50}
          size={28}
          strokeWidth={3}
          color="hsl(var(--info))"
          className="mt-1 shrink-0"
        >
          <TrendingUp className="size-3 text-info opacity-80" />
        </ActivityRing>
      </div>

      {/* Best Day */}
      <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5 flex items-start justify-between">
        <div className="space-y-1.5 min-w-0 truncate">
          <p className="text-xs text-foreground uppercase tracking-wide font-heading truncate">Best Day</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-warning mt-1 leading-none">
            {bestDay ? animBest : "—"}
          </p>
          <p className="text-xs text-foreground font-medium truncate">
            {bestDay ? formatTableDate(bestDay.log_date) : "No logs recorded"}
          </p>
        </div>
        <ActivityRing
          value={bestDayVal}
          target={60}
          size={28}
          strokeWidth={3}
          color="hsl(var(--warning))"
          className="mt-1 shrink-0"
        >
          <Award className="size-3 text-warning opacity-80" />
        </ActivityRing>
      </div>
    </div>
  );
}


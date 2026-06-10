import { lazy, Suspense } from "react";
import { TrendingUp, BarChart2 } from "lucide-react";
import { withAlpha } from "@/lib/cat-colors";

const ReportBarChart = lazy(() => import("@/components/ar/ReportBarChart"));

export interface CategoryBreakdownEntry {
  key: string;
  label: string;
  short: string;
  value: number;
  color: string;
}

interface CategoryBreakdownProps {
  breakdown: CategoryBreakdownEntry[];
  totalDocs: number;
  chartData: { date: string; docs: number }[];
}

export function CategoryBreakdown({ breakdown, totalDocs, chartData }: CategoryBreakdownProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Category breakdown progress list */}
      <div className="bg-card border border-border rounded-md p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="size-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold">Category Breakdown</h2>
        </div>
        <div className="space-y-3.5 max-h-[220px] xl:max-h-[260px] overflow-y-auto pr-1">
          {breakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No categories recorded in this range.</p>
          ) : (
            breakdown.map((c) => {
              const pct = totalDocs > 0 ? Math.round((c.value / totalDocs) * 100) : 0;
              return (
                <div key={c.label} className="space-y-1.5 group">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-muted-foreground group-hover:text-foreground font-medium transition-colors truncate">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold tabular-nums" style={{ color: c.color }}>
                        {c.value}
                      </span>
                      <span className="text-muted-foreground/60 w-8 text-right font-mono">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted/30 border border-border/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: c.color,
                        boxShadow: `0 0 4px ${withAlpha(c.color, 0.4)}`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Daily bar chart container */}
      <div className="bg-card border border-border rounded-md p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-info shrink-0" />
          <h2 className="text-sm font-semibold">Daily Document Output</h2>
        </div>
        <div className="h-44 sm:h-48 md:h-52 xl:h-60 relative">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
              Generating active output trend...
            </div>
          }>
            <ReportBarChart data={chartData} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

import { lazy, Suspense, useMemo } from "react";
import { motion, type Easing } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Plus, BarChart2 } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { Button } from "@/components/ui/button";
import { TodayHero } from "@/components/ar/TodayHero";
import { PageHeader } from "@/components/ar/PageHeader";
import { ContributionHeatmap } from "@/components/ar/ContributionHeatmap";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { useProfile } from "@/hooks/useProfile";
import { useFaxResolvedByDay, FAX_CATEGORY_KEY, FAX_CATEGORY_LABEL } from "@/hooks/useFaxTracker";
import { useIndexableResolvedByDay, INDEXABLE_CATEGORY_KEY, INDEXABLE_CATEGORY_LABEL } from "@/hooks/useIndexableTracker";
import { isoDate, totalForLog } from "@/types/log";
import { colorForKey } from "@/lib/cat-colors";
import { FigHeader, Panel, CategoryStatCard, Clock } from "@/components/ar/industrial";

const Charts = lazy(() => import("@/components/ar/Charts").then((m) => ({ default: m.Charts })));

const sectionEase: Easing = [0.23, 1, 0.32, 1];

const Console = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: categories = [] } = useCategories();
  const { data: faxByDay = {} } = useFaxResolvedByDay();
  const { data: indexableByDay = {} } = useIndexableResolvedByDay();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();

  const stats = useMemo(() => {
    const today = isoDate();
    const working = logs.filter((l) => !l.is_off_day);
    const todayLog = logs.find((l) => l.log_date === today);
    const categoryTotals = categories.map((c) => ({
      key: c.key, label: c.label, value: working.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0),
    }));
    const faxTotal = Object.values(faxByDay).reduce((s, n) => s + n, 0);
    if (faxTotal > 0) categoryTotals.push({ key: FAX_CATEGORY_KEY, label: FAX_CATEGORY_LABEL, value: faxTotal });
    const indexableTotal = Object.values(indexableByDay).reduce((s, n) => s + n, 0);
    if (indexableTotal > 0) categoryTotals.push({ key: INDEXABLE_CATEGORY_KEY, label: INDEXABLE_CATEGORY_LABEL, value: indexableTotal });
    return { todayLog, todayTotal: todayLog ? totalForLog(todayLog) : 0, categoryTotals, workingCount: working.length };
  }, [logs, categories, faxByDay, indexableByDay]);

  const isEmpty = !isLoading && logs.length === 0;

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Console"
        subtitle={displayName ? `OP: ${displayName}` : undefined}
        actions={<Clock />}
      />

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 relative z-[1]">
        <div className="w-full space-y-6 sm:space-y-8">

          {/* ── Status row ── */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border border-border p-4 flex items-center gap-4">
                  <Skeleton circle width={52} height={52} />
                  <div className="space-y-1.5"><Skeleton width={72} height={12} /><Skeleton width={56} height={24} /></div>
                </div>
              ))}
            </div>
          ) : !isEmpty && <TodayHero logs={logs} />}

          {/* ── Category breakdown ── */}
          <section>
            <FigHeader code="FIG.01" title="Cumulative by Category" />
            <div className="grid gap-2 sm:gap-3 [grid-template-columns:repeat(auto-fill,minmax(124px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border p-3 space-y-2">
                      <Skeleton width={56} height={12} /><Skeleton width={40} height={24} />
                    </div>
                  ))
                : [...stats.categoryTotals].sort((a, b) => b.value - a.value).map((c, i) => (
                    <CategoryStatCard key={c.key} code={`CAT-${String(i + 1).padStart(2, "0")}`} label={c.label} value={c.value} color={colorForKey(c.key)} />
                  ))}
            </div>
          </section>

          {/* ── Heatmap ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.35, ease: sectionEase }}
          >
            <FigHeader code="FIG.02" title="Activity Density" />
            {isLoading ? (
              <Panel tag="HEATMAP">
                <Skeleton height={144} />
              </Panel>
            ) : !isEmpty && <Panel tag="HEATMAP"><ContributionHeatmap logs={logs} /></Panel>}
          </motion.section>

          {/* ── Charts ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, ease: sectionEase }}
          >
            <FigHeader code="FIG.03" title="Trends & Breakdown" />
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Panel key={i} tag="CHART" className={i === 0 || i === 3 ? "lg:col-span-2" : ""}>
                    <Skeleton height={208} />
                  </Panel>
                ))}
              </div>
            ) : isEmpty ? (
              <Panel tag="EMPTY" className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
                <BarChart2 className="size-12 opacity-20" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">NO DATA ON RECORD</p>
                  <p className="text-xs font-mono">Log a day to populate the readout.</p>
                </div>
                <Button size="sm" onClick={() => navigate("/log")}><Plus className="size-4 mr-1" /> Log first day</Button>
              </Panel>
            ) : (
              <Suspense fallback={null}><Charts logs={logs} categories={categories} /></Suspense>
            )}
          </motion.section>

        </div>
      </main>
    </div>
  );
};

export default Console;

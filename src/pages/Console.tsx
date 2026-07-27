import { lazy, Suspense, useMemo } from "react";
import { motion, type Easing } from "motion/react";
import { LineChart } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { ActivitySection } from "@/components/ar/ActivitySection";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { useFaxResolvedByDay, FAX_CATEGORY_KEY, FAX_CATEGORY_LABEL } from "@/hooks/useFaxTracker";
import { useIndexableResolvedByDay, INDEXABLE_CATEGORY_KEY, INDEXABLE_CATEGORY_LABEL } from "@/hooks/useIndexableTracker";
import { isoDate, totalForLog } from "@/types/log";
import { colorForKey } from "@/lib/cat-colors";
import { FigHeader, Panel, CategoryStatCard, EmptyState } from "@/components/ar/industrial";

const Charts = lazy(() => import("@/components/ar/Charts").then((m) => ({ default: m.Charts })));

const sectionEase: Easing = [0.23, 1, 0.32, 1];

const Console = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: categories = [] } = useCategories();
  const { data: faxByDay = {} } = useFaxResolvedByDay();
  const { data: indexableByDay = {} } = useIndexableResolvedByDay();

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
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 relative z-[1]">
        <div className="w-full space-y-6 sm:space-y-8">

          {/* ── Category breakdown ── */}
          <section>
            <FigHeader title="Cumulative by Category" />
            <div className="grid gap-2 sm:gap-3 [grid-template-columns:repeat(auto-fill,minmax(124px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border p-3 space-y-2">
                      <Skeleton width={56} height={12} /><Skeleton width={40} height={24} />
                    </div>
                  ))
                  : [...stats.categoryTotals].sort((a, b) => b.value - a.value).map((c, i) => (
                    <CategoryStatCard key={c.key} label={c.label} value={c.value} color={colorForKey(c.key)} />
                  ))}
              </div>
          </section>

          {/* ── Activity ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: sectionEase }}
          >
            <ActivitySection logs={logs} isLoading={isLoading} />
          </motion.section>

          {/* ── Charts ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: sectionEase, delay: 0.1 }}
          >
            <FigHeader title="Trends & Breakdown" />
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Panel key={i} tag="CHART" className={i === 0 || i === 3 ? "lg:col-span-2" : ""}>
                    <Skeleton height={208} />
                  </Panel>
                ))}
              </div>
            ) : isEmpty ? (
              <Panel tag="CHART">
                <EmptyState
                  icon={LineChart}
                  title="No Trends Yet"
                  hint="Charts appear once you have logged days."
                />
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

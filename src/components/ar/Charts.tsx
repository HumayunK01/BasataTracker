import { memo, useMemo } from "react";
import { DeferRender } from "@/components/ar/DeferRender";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- Charts is already lazy-loaded by its caller (Index.tsx); top-level recharts import here is intentional
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { totalForLog, formatShortDate, type DailyLog } from "@/types/log";
import type { Category } from "@/hooks/useCategories";
import { colorForKey } from "@/lib/cat-colors";

interface Props {
  logs: DailyLog[];
  categories: Category[];
}

const T = {
  container: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    padding: "10px 14px",
    boxShadow: "0 4px 24px hsl(var(--foreground) / 0.25)",
  },
  text: { fontSize: "13px", color: "hsl(var(--popover-foreground))" },
  axis: { stroke: "hsl(var(--muted-foreground))", fontSize: 12 } as const,
  grid: "hsl(var(--border))",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ChartCard({ title, subtitle, height = "h-48 sm:h-56", children, className = "", footer }: {
  title: string;
  subtitle?: string;
  height?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className={`cv-auto bg-card border border-border rounded-md p-4 sm:p-5 ${className}`}>
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className={height}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
      {footer}
    </div>
  );
}

// Compact legend rendered outside the chart so it never eats plot height.
// Short codes on phones, full labels from sm up.
function CategoryLegend({ categories }: { categories: Category[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs mt-3">
      {categories.map((c) => (
        <div key={c.key} className="flex items-center gap-1 min-w-0">
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: colorForKey(c.key) }} />
          <span className="text-muted-foreground truncate">
            <span className="sm:hidden">{c.short}</span>
            <span className="hidden sm:inline">{c.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export const Charts = memo(function Charts({ logs, categories }: Props) {
  const workingLogs = useMemo(() => logs.filter((l) => !l.is_off_day), [logs]);
  const sorted = useMemo(
    () => [...workingLogs].sort((a, b) => a.log_date.localeCompare(b.log_date)),
    [workingLogs],
  );

  const trend = useMemo(() =>
    sorted.slice(-21).map((l) => ({ date: formatShortDate(l.log_date), docs: totalForLog(l) })),
    [sorted],
  );

  const trendYDomain = useMemo((): [number, number] => {
    if (trend.length === 0) return [0, 10];
    const vals = trend.map((d) => d.docs);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = Math.ceil((max - min) * 0.1) || 5;
    return [Math.max(0, min - padding), max + padding];
  }, [trend]);

  const categoryTotals = useMemo(() =>
    categories.reduce<{ key: string; name: string; value: number }[]>((acc, c) => {
      const value = workingLogs.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0);
      if (value > 0) acc.push({ key: c.key, name: c.label, value });
      return acc;
    }, []),
    [categories, workingLogs],
  );

  const stacked = useMemo(() =>
    sorted.slice(-14).map((l) => {
      const row: Record<string, number | string> = { date: formatShortDate(l.log_date) };
      categories.forEach((c) => { row[c.label] = (l.counts ?? {})[c.key] ?? 0; });
      return row;
    }),
    [sorted, categories],
  );

  const weeklyTotals = useMemo(() => {
    const map = new Map<string, number>();
    workingLogs.forEach((l) => {
      const d = new Date(`${l.log_date}T12:00:00`);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const key = monday.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + totalForLog(l));
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([iso, total]) => {
        const d = new Date(`${iso}T12:00:00`);
        return {
          week: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          total,
        };
      });
  }, [workingLogs]);

  const dowAvg = useMemo(() => {
    const buckets: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    workingLogs.forEach((l) => {
      const d = new Date(`${l.log_date}T12:00:00`).getDay();
      if (buckets[d]) buckets[d].push(totalForLog(l));
    });
    return [1, 2, 3, 4, 5].map((d) => ({
      day: DAYS[d],
      avg: buckets[d].length ? Math.round(buckets[d].reduce((s, v) => s + v, 0) / buckets[d].length) : 0,
    }));
  }, [workingLogs]);

  const categoryTrend = useMemo(() =>
    sorted.slice(-30).map((l) => {
      const row: Record<string, number | string> = { date: formatShortDate(l.log_date) };
      categories.forEach((c) => { row[c.short] = (l.counts ?? {})[c.key] ?? 0; });
      return row;
    }),
    [sorted, categories],
  );

  const radarData = useMemo(() =>
    categories.map((c) => {
      const vals = workingLogs.map((l) => (l.counts ?? {})[c.key] ?? 0);
      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      return { category: c.short, avg: Math.round(avg * 10) / 10 };
    }),
    [categories, workingLogs],
  );

  if (workingLogs.length === 0) return null;

  return (
    <div className="space-y-4">

      {/* Row 1: Daily trend + Work mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Daily Documents"
          subtitle="Last 21 working days"
          height="h-48 sm:h-56 md:h-60 xl:h-72"
          className="lg:col-span-2"
        >
          <AreaChart data={trend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-daily" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
            <XAxis dataKey="date" {...T.axis} tickLine={false} axisLine={false} dy={8} />
            <YAxis
              {...T.axis}
              allowDecimals={false}
              width={32}
              tickLine={false}
              axisLine={false}
              domain={trendYDomain}
            />
            <Tooltip
              contentStyle={T.container}
              labelStyle={{ ...T.text, fontWeight: 600, marginBottom: 4 }}
              itemStyle={T.text}
              cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="docs"
              name="Documents"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#grad-daily)"
              dot={{ fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
              activeDot={{ fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2, r: 5 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartCard>

        <div className="bg-card border border-border rounded-md p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3">Work mix{"—"}all time</h3>
          <div className="h-40 sm:h-44 xl:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="65%" paddingAngle={2} isAnimationActive={false}>
                  {categoryTotals.map((d) => <Cell key={d.key} fill={colorForKey(d.key)} />)}
                </Pie>
                <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-x-3 gap-y-1 text-xs flex-wrap mt-1">
            {categoryTotals.map((s) => (
              <div key={s.name} className="flex items-center gap-1 min-w-0">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: colorForKey(s.key) }} />
                <span className="text-muted-foreground truncate">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Weekly totals + Day-of-week avg */}
      <DeferRender minHeight={224} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Weekly Totals" subtitle="Last 10 weeks" height="h-44 sm:h-48 md:h-52 xl:h-60">
          <BarChart data={weeklyTotals} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
            <XAxis dataKey="week" {...T.axis} tickLine={false} axisLine={false} dy={8} />
            <YAxis {...T.axis} allowDecimals={false} width={32} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={T.container} labelStyle={{ ...T.text, fontWeight: 600 }} itemStyle={T.text} cursor={{ fill: "hsl(var(--accent))", radius: 4 }} />
            <Bar dataKey="total" name="Documents" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {weeklyTotals.map((entry, i) => (
                <Cell key={`week-${entry.week}`} fill={i === weeklyTotals.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Avg by Day of Week" subtitle="Based on all working days" height="h-44 sm:h-48 md:h-52 xl:h-60">
          <BarChart data={dowAvg} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
            <XAxis dataKey="day" {...T.axis} tickLine={false} axisLine={false} dy={8} />
            <YAxis {...T.axis} allowDecimals={false} width={32} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={T.container} labelStyle={{ ...T.text, fontWeight: 600 }} itemStyle={T.text} cursor={{ fill: "hsl(var(--accent))" }} />
            <Bar dataKey="avg" name="Avg docs" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
              {dowAvg.map((entry) => (
                <Cell key={`dow-${entry.day}`} fill={entry.avg === Math.max(...dowAvg.map((d) => d.avg)) ? "hsl(var(--warning))" : "hsl(var(--info) / 0.55)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </DeferRender>

      {/* Row 3: Category area trend + Radar */}
      <DeferRender minHeight={272} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Category Trends"
          subtitle="Last 30 working days"
          height="h-48 sm:h-56 md:h-60 xl:h-72"
          className="lg:col-span-2"
          footer={<CategoryLegend categories={categories} />}
        >
          <AreaChart data={categoryTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <defs>
              {categories.map((c) => (
                <linearGradient key={c.key} id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorForKey(c.key)} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colorForKey(c.key)} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
            <XAxis dataKey="date" {...T.axis} tickLine={false} axisLine={false} dy={8} />
            <YAxis {...T.axis} allowDecimals={false} width={32} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={T.container} labelStyle={{ ...T.text, fontWeight: 600 }} itemStyle={T.text} />
            {categories.map((c) => (
              <Area
                key={c.key}
                type="monotone"
                dataKey={c.short}
                name={c.label}
                stroke={colorForKey(c.key)}
                fill={`url(#grad-${c.key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ChartCard>

        <ChartCard title="Category Balance" subtitle="Avg documents per day" height="h-48 sm:h-56 md:h-60 xl:h-72">
          <RadarChart data={radarData} outerRadius="65%">
            <PolarGrid stroke={T.grid} />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Radar name="Avg docs" dataKey="avg" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
            <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} />
          </RadarChart>
        </ChartCard>
      </DeferRender>

      {/* Row 4: Full-width stacked bar breakdown */}
      <DeferRender minHeight={320} id="breakdown" className="cv-auto bg-card border border-border rounded-md p-4 sm:p-5">
        <div className="mb-3 sm:mb-4">
          <h3 className="text-sm font-semibold">Document Breakdown</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 14 working days by category</p>
        </div>
        <div className="h-48 sm:h-56 md:h-64 xl:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stacked} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
              <XAxis dataKey="date" {...T.axis} tickLine={false} axisLine={false} dy={8} />
              <YAxis {...T.axis} allowDecimals={false} width={40} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={T.container} cursor={{ fill: "hsl(var(--accent))" }} labelStyle={{ ...T.text, fontWeight: 600 }} itemStyle={T.text} />
              {categories.map((c, i) => (
                <Bar
                  key={c.key}
                  dataKey={c.label}
                  stackId="a"
                  fill={colorForKey(c.key)}
                  // Bottom segment gets bottom rounding, all others flat
                  radius={i === 0 ? [0, 0, 3, 3] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                  shape={(props: Record<string, unknown>) => {
                    const { x, y, width, height, fill } = props as {
                      x: number; y: number; width: number; height: number; fill: string;
                      index: number;
                    };
                    if (!height || height <= 0) return <g />;
                    // Check if this is the topmost non-zero segment for this bar
                    const rowData = stacked[props.index as number] ?? {};
                    const catLabels = categories.map((cat) => cat.label);
                    const myIdx = catLabels.indexOf(c.label);
                    const isTop = catLabels.slice(myIdx + 1).every((label) => !rowData[label]);
                    const r = isTop ? 4 : 0;
                    return (
                      <path
                        d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
                        fill={fill}
                      />
                    );
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <CategoryLegend categories={categories} />
      </DeferRender>

    </div>
  );
});

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { CATEGORIES, totalForLog, formatShortDate, type DailyLog } from "@/types/log";

interface Props {
  logs: DailyLog[];
}

export const CAT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(160 70% 60%)",
  "hsl(280 70% 65%)",
  "hsl(20 85% 60%)",
];

const T = {
  container: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "6px",
  },
  text: { fontSize: "12px", color: "hsl(var(--popover-foreground))" },
  axis: { stroke: "hsl(var(--muted-foreground))", fontSize: 11 } as const,
  grid: "hsl(var(--border))",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ChartCard({ title, height = "h-48 sm:h-56", children, className = "" }: {
  title: string;
  height?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      <div className={height}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Charts({ logs }: Props) {
  const workingLogs = useMemo(() => logs.filter((l) => !l.is_off_day), [logs]);
  const sorted = useMemo(
    () => [...workingLogs].sort((a, b) => a.log_date.localeCompare(b.log_date)),
    [workingLogs],
  );

  const trend = useMemo(() =>
    sorted.slice(-21).map((l) => ({ date: formatShortDate(l.log_date), docs: totalForLog(l) })),
    [sorted],
  );

  const categoryTotals = useMemo(() =>
    CATEGORIES.map((c) => ({
      name: c.label,
      value: workingLogs.reduce((s, l) => s + l[c.key], 0),
    })).filter((d) => d.value > 0),
    [workingLogs],
  );

  const stacked = useMemo(() =>
    sorted.slice(-14).map((l) => {
      const row: Record<string, number | string> = { date: formatShortDate(l.log_date) };
      CATEGORIES.forEach((c) => (row[c.label] = l[c.key]));
      return row;
    }),
    [sorted],
  );

  const weeklyTotals = useMemo(() => {
    const map = new Map<string, number>();
    workingLogs.forEach((l) => {
      const d = new Date(l.log_date + "T12:00:00");
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
        const d = new Date(iso + "T12:00:00");
        return {
          week: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          total,
        };
      });
  }, [workingLogs]);

  const dowAvg = useMemo(() => {
    const buckets: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    workingLogs.forEach((l) => {
      const d = new Date(l.log_date + "T12:00:00").getDay();
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
      CATEGORIES.forEach((c) => (row[c.short] = l[c.key]));
      return row;
    }),
    [sorted],
  );

  const radarData = useMemo(() =>
    CATEGORIES.map((c) => {
      const vals = workingLogs.map((l) => l[c.key]);
      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      return { category: c.short, avg: Math.round(avg * 10) / 10 };
    }),
    [workingLogs],
  );

  if (workingLogs.length === 0) return null;

  return (
    <div className="space-y-4">

      {/* Row 1: Daily trend + Work mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Daily documents — last 21 working days" height="h-44 sm:h-56" className="lg:col-span-2">
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
            <XAxis dataKey="date" {...T.axis} />
            <YAxis {...T.axis} allowDecimals={false} width={35} />
            <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} />
            <Line type="monotone" dataKey="docs" name="Documents" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
          </LineChart>
        </ChartCard>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Work mix — all time</h3>
          <div className="h-36 sm:h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="65%" paddingAngle={2}>
                  {categoryTotals.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-x-3 gap-y-1 text-xs flex-wrap mt-1">
            {categoryTotals.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                <span className="text-muted-foreground truncate">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Weekly totals + Day-of-week avg */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Weekly totals — last 10 weeks" height="h-44 sm:h-52">
          <BarChart data={weeklyTotals}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
            <XAxis dataKey="week" {...T.axis} />
            <YAxis {...T.axis} allowDecimals={false} width={35} />
            <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} cursor={{ fill: "hsl(var(--accent))" }} />
            <Bar dataKey="total" name="Documents" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {weeklyTotals.map((_, i) => (
                <Cell key={i} fill={i === weeklyTotals.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Avg documents by day of week" height="h-44 sm:h-52">
          <BarChart data={dowAvg}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
            <XAxis dataKey="day" {...T.axis} />
            <YAxis {...T.axis} allowDecimals={false} width={35} />
            <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} cursor={{ fill: "hsl(var(--accent))" }} />
            <Bar dataKey="avg" name="Avg docs" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {dowAvg.map((entry, i) => (
                <Cell key={i} fill={entry.avg === Math.max(...dowAvg.map((d) => d.avg)) ? "hsl(var(--warning))" : "hsl(var(--info) / 0.6)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      {/* Row 3: Category area trend + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Category trends — last 30 working days" height="h-44 sm:h-56" className="lg:col-span-2">
          <AreaChart data={categoryTrend}>
            <defs>
              {CATEGORIES.map((c, i) => (
                <linearGradient key={c.key} id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CAT_COLORS[i % CAT_COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CAT_COLORS[i % CAT_COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
            <XAxis dataKey="date" {...T.axis} />
            <YAxis {...T.axis} allowDecimals={false} width={35} />
            <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            {CATEGORIES.map((c, i) => (
              <Area
                key={c.key}
                type="monotone"
                dataKey={c.short}
                name={c.label}
                stroke={CAT_COLORS[i % CAT_COLORS.length]}
                fill={`url(#grad-${c.key})`}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </AreaChart>
        </ChartCard>

        <ChartCard title="Category balance — avg / day" height="h-44 sm:h-56">
          <RadarChart data={radarData} outerRadius="65%">
            <PolarGrid stroke={T.grid} />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Radar name="Avg docs" dataKey="avg" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
            <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} />
          </RadarChart>
        </ChartCard>
      </div>

      {/* Row 4: Full-width stacked bar breakdown */}
      <div id="breakdown" className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Last 14 working days — document breakdown</h3>
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stacked}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
              <XAxis dataKey="date" {...T.axis} />
              <YAxis {...T.axis} allowDecimals={false} width={35} />
              <Tooltip contentStyle={T.container} cursor={{ fill: "hsl(var(--accent))" }} labelStyle={T.text} itemStyle={T.text} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {CATEGORIES.map((c, i) => (
                <Bar key={c.key} dataKey={c.label} stackId="a" fill={CAT_COLORS[i % CAT_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

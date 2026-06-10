// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- this file IS the lazy chunk; top-level import is intentional
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ChartEntry { date: string; docs: number; }

const T = {
  grid: "hsl(var(--border))",
  axis: { tick: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } },
  text: { fontSize: 12, fill: "hsl(var(--foreground))" },
  container: { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 },
};

export default function ReportBarChart({ data }: { data: ChartEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={data.length > 20 ? 6 : data.length > 10 ? 10 : 18} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
        <XAxis
          dataKey="date"
          {...T.axis}
          tickLine={false}
          axisLine={false}
          dy={8}
          tickFormatter={(v) => { const p = v.split("/"); return `${p[0]}/${p[1]}`; }}
          interval={data.length > 20 ? Math.floor(data.length / 10) : 0}
        />
        <YAxis {...T.axis} allowDecimals={false} width={40} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={T.container} labelStyle={T.text} itemStyle={T.text} cursor={{ fill: "hsl(var(--accent))" }} />
        <Bar dataKey="docs" name="Documents" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={`bar-${entry.date}`} fill={i === data.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.5)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

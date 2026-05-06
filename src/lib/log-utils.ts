import type { Category } from "@/hooks/useCategories";
import { type DailyLog, totalForLog } from "@/types/log";

export function toCSV(logs: DailyLog[], categories: Category[]): string {
  const headers = ["Date", "Day", ...categories.map((c) => c.label), "Total", "Off Day", "Notes"];
  const safeStr = (s: string) => s && /^[=+@\-|%]/.test(s) ? `'${s}` : s;
  const escape = (v: unknown) => {
    const s = v == null ? "" : safeStr(String(v));
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = logs.map((l) => {
    const dayName = new Date(`${l.log_date}T12:00:00`).toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "long",
    });
    return [
      l.log_date,
      dayName,
      ...categories.map((c) => (l.counts ?? {})[c.key] ?? 0),
      totalForLog(l),
      l.is_off_day ? "Yes" : "",
      l.notes ?? "",
    ]
      .map(escape)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(logs: DailyLog[], categories: Category[], filename = "ar-record.csv") {
  const blob = new Blob([toCSV(logs, categories)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toJSON(logs: DailyLog[], categories: Category[]): string {
  const safeStr = (s: string | null | undefined) => s ?? "";
  const payload = {
    exported_at: new Date().toISOString(),
    categories: categories.map((c) => ({ key: c.key, label: c.label, short: c.short })),
    logs: logs.map((l) => ({
      date: l.log_date,
      day: new Date(`${l.log_date}T12:00:00`).toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
        weekday: "long",
      }),
      counts: Object.fromEntries(
        categories.map((c) => [c.key, (l.counts ?? {})[c.key] ?? 0])
      ),
      total: totalForLog(l),
      is_off_day: l.is_off_day,
      notes: safeStr(l.notes),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadJSON(logs: DailyLog[], categories: Category[], filename = "ar-record.json") {
  const blob = new Blob([toJSON(logs, categories)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

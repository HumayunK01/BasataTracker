import { CATEGORIES, type DailyLog, totalForLog } from "@/types/log";

export function toCSV(logs: DailyLog[]): string {
  const headers = ["Date", "Day", ...CATEGORIES.map((c) => c.label), "Total", "Off Day", "Notes"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = logs.map((l) => {
    const dayName = new Date(l.log_date + "T12:00:00").toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
    });
    return [
      l.log_date,
      dayName,
      ...CATEGORIES.map((c) => l[c.key]),
      totalForLog(l),
      l.is_off_day ? "Yes" : "",
      l.notes ?? "",
    ]
      .map(escape)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(logs: DailyLog[], filename = "ar-record.csv") {
  const blob = new Blob([toCSV(logs)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

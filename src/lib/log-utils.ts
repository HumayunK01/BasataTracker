import type { Category } from "@/hooks/useCategories";
import { type DailyLog, totalForLog, isoDate, isWeekend } from "@/types/log";

const DAY_MS = 86_400_000;

/**
 * Logging streaks in working days. A day with docs logged extends the streak;
 * weekends, off-days, and a not-yet-logged today are neutral (skipped, not
 * broken); a weekday with no log breaks it.
 */
export function computeStreaks(logs: DailyLog[]): { current: number; best: number } {
  if (logs.length === 0) return { current: 0, best: 0 };
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const today = isoDate();

  type DayKind = "count" | "neutral" | "break";
  const dayKind = (iso: string): DayKind => {
    const log = byDate.get(iso);
    if (log && !log.is_off_day && totalForLog(log) > 0) return "count";
    if (isWeekend(iso) || log?.is_off_day) return "neutral";
    return "break";
  };

  // Current streak: walk back from today (bounded ~3y, matching the query's 1000-row cap)
  let current = 0;
  for (let t = Date.now(), i = 0; i < 1100; i++, t -= DAY_MS) {
    const iso = isoDate(new Date(t));
    const kind = dayKind(iso);
    if (kind === "count") current++;
    else if (kind === "break" && iso !== today) break;
  }

  // Best streak: walk from the earliest logged day up to today
  const earliest = [...byDate.keys()].sort()[0];
  let best = 0;
  let run = 0;
  for (let t = new Date(`${earliest}T12:00:00`).getTime(), i = 0; i < 4000; i++, t += DAY_MS) {
    const iso = isoDate(new Date(t));
    if (iso > today) break;
    const kind = dayKind(iso);
    if (kind === "count") {
      run++;
      if (run > best) best = run;
    } else if (kind === "break") {
      run = 0;
    }
    if (iso === today) break;
  }

  return { current, best: Math.max(best, current) };
}

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

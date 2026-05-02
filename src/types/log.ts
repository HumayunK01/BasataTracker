export const CATEGORIES = [
  { key: "worked_on_ng", label: "Worked on NG", short: "NG" },
  { key: "moved_to_indexing", label: "Moved to Indexing", short: "Indexing" },
  { key: "ekg", label: "EKG", short: "EKG" },
  { key: "cath_lab", label: "Cath Lab", short: "Cath" },
  { key: "roi", label: "ROI", short: "ROI" },
  { key: "fax_back", label: "Fax Back", short: "Fax" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export interface DailyLog {
  id: string;
  log_date: string;
  worked_on_ng: number;
  moved_to_indexing: number;
  ekg: number;
  cath_lab: number;
  roi: number;
  fax_back: number;
  extra: Record<string, number>;
  is_off_day: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DailyLogInsert = Omit<DailyLog, "id" | "created_at" | "updated_at">;

export function totalForLog(log: Pick<DailyLog, CategoryKey>): number {
  return CATEGORIES.reduce((sum, c) => sum + (log[c.key] || 0), 0);
}

const US_TZ = "America/New_York";
const US_LOCALE = "en-US";

export function isoDate(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat(US_LOCALE, {
    timeZone: US_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isWeekend(iso: string): boolean {
  const day = new Intl.DateTimeFormat(US_LOCALE, { timeZone: US_TZ, weekday: "short" })
    .format(new Date(iso + "T12:00:00"));
  return day === "Sun" || day === "Sat";
}

export function formatShortDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(US_LOCALE, { timeZone: US_TZ, month: "short", day: "numeric" });
}

export function formatDayName(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(US_LOCALE, { timeZone: US_TZ, weekday: "short" });
}

export function formatHeaderDate(d: Date = new Date()) {
  const date = d.toLocaleDateString(US_LOCALE, {
    timeZone: US_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(US_LOCALE, {
    timeZone: US_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}

export function formatTableDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(US_LOCALE, { timeZone: US_TZ, month: "2-digit", day: "2-digit", year: "numeric" });
}

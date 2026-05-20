export interface DailyLog {
  id: string;
  log_date: string;
  counts: Record<string, number>;
  is_off_day: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DailyLogInsert = Omit<DailyLog, "id" | "created_at" | "updated_at">;

export function totalForLog(log: Pick<DailyLog, "counts">): number {
  return Object.values(log.counts ?? {}).reduce((sum, v) => sum + (v || 0), 0);
}

const US_TZ = "America/Chicago";
const US_LOCALE = "en-US";

const isoFmt = new Intl.DateTimeFormat(US_LOCALE, { timeZone: US_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat(US_LOCALE, { timeZone: US_TZ, weekday: "short" });
const shortDateFmt = new Intl.DateTimeFormat(US_LOCALE, { timeZone: US_TZ, month: "short", day: "numeric" });
const dayNameFmt = new Intl.DateTimeFormat(US_LOCALE, { timeZone: US_TZ, weekday: "short" });
const headerDateFmt = new Intl.DateTimeFormat(US_LOCALE, { timeZone: US_TZ, weekday: "long", month: "long", day: "numeric", year: "numeric" });
const headerTimeFmt = new Intl.DateTimeFormat(US_LOCALE, { timeZone: US_TZ, hour: "numeric", minute: "2-digit", hour12: true });
const tableDateFmt = new Intl.DateTimeFormat(US_LOCALE, { timeZone: US_TZ, month: "2-digit", day: "2-digit", year: "numeric" });

export function isoDate(d: Date = new Date()) {
  const parts = isoFmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isWeekend(iso: string): boolean {
  const day = weekdayFmt.format(new Date(`${iso}T12:00:00`));
  return day === "Sun" || day === "Sat";
}

export function formatShortDate(iso: string) {
  return shortDateFmt.format(new Date(`${iso}T12:00:00`));
}

export function formatDayName(iso: string) {
  return dayNameFmt.format(new Date(`${iso}T12:00:00`));
}

export function formatHeaderDate(d: Date = new Date()) {
  return `${headerDateFmt.format(d)} · ${headerTimeFmt.format(d)}`;
}

export function formatTableDate(iso: string) {
  return tableDateFmt.format(new Date(`${iso}T12:00:00`));
}

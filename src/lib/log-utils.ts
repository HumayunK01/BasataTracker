import type { Category } from "@/hooks/useCategories";
import { type DailyLog, totalForLog, isoDate, isWeekend } from "@/types/log";

const DAY_MS = 86_400_000;

// ponytail: business is Chicago-based; one source of truth instead of 3 inline copies.
const APP_TZ = "America/Chicago";

// Interpret the date at UTC noon, then render in APP_TZ — correct weekday for any viewer tz.
function weekday(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: APP_TZ, weekday: "long" });
}

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
    const dayName = weekday(l.log_date);
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
      day: weekday(l.log_date),
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

/** ISO `YYYY-MM-DD` → `MM-DD-YYYY` (US display format used in PDF exports). */
export function formatUSDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
}

/**
 * Print-ready PDF export. jspdf + autotable are dynamically imported so the
 * ~300KB library only loads when a user actually exports a PDF.
 */
export async function downloadPDF(
  logs: DailyLog[],
  categories: Category[],
  filename = "ar-record.pdf",
  opts: { title?: string; subtitle?: string; userName?: string } = {},
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const working = logs.filter((l) => !l.is_off_day);

  // Skip categories with no counts in the exported range — all-zero columns are noise
  const activeCategories = categories.filter((c) =>
    working.some((l) => ((l.counts ?? {})[c.key] ?? 0) > 0),
  );

  // Landscape keeps many category columns readable
  const orientation = activeCategories.length > 6 ? "landscape" : "portrait";
  const doc = new JsPDF({ orientation, unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  const totalDocs = working.reduce((s, l) => s + totalForLog(l), 0);
  const avg = working.length ? Math.round(totalDocs / working.length) : 0;
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const rangeLabel = sorted.length
    ? `${formatUSDate(sorted[0].log_date)} to ${formatUSDate(sorted[sorted.length - 1].log_date)}`
    : "No data";

  // ── Header ──
  // App logo, top-right (the light-theme logo — PDF pages are white).
  // Non-fatal if it can't be loaded; the export still completes.
  try {
    const img = new Image();
    img.src = "/lightlogo.png";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const logoH = 28;
    const logoW = (img.naturalWidth / img.naturalHeight) * logoH;
    doc.addImage(canvas.toDataURL("image/png"), "PNG", pageWidth - margin - logoW, 24, logoW, logoH);
  } catch {
    // logo unavailable — skip it
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(opts.title ?? "Basata Tracker Daily Log", margin, 44);

  let y = 60;
  if (opts.userName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(opts.userName, margin, y);
    y += 14;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(opts.subtitle ?? rangeLabel, margin, y);
  doc.text(
    `Exported ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 20;

  // ── Summary line ──
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    `${totalDocs} documents  ·  ${working.length} working days  ·  ${logs.length - working.length} weekend/off days  ·  avg ${avg} docs/day`,
    margin,
    y,
  );
  y += 16;

  // ── Table ──
  const dayName = (iso: string) => weekday(iso);

  const body = sorted.map((l) => {
    if (l.is_off_day) {
      return [
        formatUSDate(l.log_date),
        dayName(l.log_date),
        ...activeCategories.map(() => "—"),
        isWeekend(l.log_date) ? "Weekend" : "Off day",
      ];
    }
    return [
      formatUSDate(l.log_date),
      dayName(l.log_date),
      ...activeCategories.map((c) => String((l.counts ?? {})[c.key] ?? 0)),
      String(totalForLog(l)),
    ];
  });

  const catTotals = activeCategories.map((c) =>
    working.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0),
  );

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Date", "Day", ...activeCategories.map((c) => c.short), "Total"]],
    body,
    foot: [["Total", "", ...catTotals.map(String), String(totalDocs)]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: 40, lineColor: [220, 220, 225], lineWidth: 0.5 },
    headStyles: { fillColor: [37, 42, 60], textColor: 255, fontStyle: "bold", halign: "center" },
    footStyles: { fillColor: [240, 241, 245], textColor: 30, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 64 },
      1: { cellWidth: 64 },
      ...Object.fromEntries(activeCategories.map((_, i) => [i + 2, { halign: "center" as const }])),
      [activeCategories.length + 2]: { halign: "center" as const, fontStyle: "bold" as const },
    },
    didParseCell: (data) => {
      // Mute weekend/off-day rows so working days stand out
      if (data.section === "body" && sorted[data.row.index]?.is_off_day) {
        data.cell.styles.textColor = 150;
        data.cell.styles.fillColor = [248, 248, 250];
      }
      // columnStyles only apply to the body, so center the foot totals here
      if (data.section === "foot" && data.column.index >= 2) {
        data.cell.styles.halign = "center";
      }
    },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${doc.getCurrentPageInfo().pageNumber}`,
        pageWidth - margin,
        pageHeight - 20,
        { align: "right" },
      );
    },
  });

  doc.save(filename);
}

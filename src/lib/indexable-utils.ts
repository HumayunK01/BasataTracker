import type { IndexableRow } from "@/hooks/useIndexableTracker";

function stripHash(status: string): string {
  return status.replace(/\s*#\s*$/, "").trim();
}

/**
 * Export the given indexable rows to a PDF. Pass the already-filtered list so
 * the export matches whatever filters/search are active on screen.
 */
export async function downloadIndexablePDF(
  rows: IndexableRow[],
  filename = "indexable-tracker.pdf",
  opts: { subtitle?: string; userName?: string } = {},
) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  // Landscape — six columns of mostly-text read better wide.
  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  const resolved = rows.filter((r) => r.overall_status.startsWith("Resolved")).length;
  const failed = rows.filter((r) => r.overall_status === "All Steps Failed").length;
  const waiting = rows.filter((r) => r.overall_status.startsWith("Waiting")).length;

  // ── Header: logo top-right (light logo — PDF pages are white) ──
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
  doc.text("Phoenix Heart Indexable Tracker", margin, 44);

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
  if (opts.subtitle) doc.text(opts.subtitle, margin, y);
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
    `${rows.length} patients  ·  ${resolved} resolved  ·  ${failed} all steps failed  ·  ${waiting} waiting`,
    margin,
    y,
  );
  y += 16;

  const body = rows.map((r) => [
    r.patient_name,
    r.step1 ?? "—",
    r.step2 ?? "—",
    r.step3 ?? "—",
    stripHash(r.overall_status),
    r.notes ?? "",
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Patient", "Step 1 – Refax Same", "Step 2 – Refax New", "Step 3 – Reupload Indexable", "Overall Status", "Notes"]],
    body,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: 40, lineColor: [220, 220, 225], lineWidth: 0.5, overflow: "linebreak" },
    headStyles: { fillColor: [37, 42, 60], textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center", cellWidth: 120 },
      5: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const row = rows[data.row.index];
      if (!row) return;
      // Tint resolved rows green and all-steps-failed rows red (like the app).
      if (row.overall_status.startsWith("Resolved")) {
        data.cell.styles.fillColor = [232, 248, 239];
      } else if (row.overall_status === "All Steps Failed") {
        data.cell.styles.fillColor = [252, 235, 235];
      } else if (row.overall_status.startsWith("Waiting")) {
        data.cell.styles.fillColor = [253, 248, 228];
      }
      // Color the individual step/overall text.
      const text = String(data.cell.raw ?? "");
      if (data.column.index >= 1 && data.column.index <= 4) {
        if (text === "Successfully Sent" || text.startsWith("Resolved")) data.cell.styles.textColor = [21, 128, 61];
        else if (text === "Failed" || text === "All Steps Failed") data.cell.styles.textColor = [185, 28, 28];
        else if (text === "Waiting" || text.startsWith("Waiting")) data.cell.styles.textColor = [161, 98, 7];
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

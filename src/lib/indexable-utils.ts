import type { IndexableRow } from "@/hooks/useIndexableTracker";
import { downloadTrackerPDF, INDEXABLE_PDF_CONFIG } from "./tracker-utils";

export async function downloadIndexablePDF(
  rows: IndexableRow[],
  filename = INDEXABLE_PDF_CONFIG.defaultFilename,
  opts: {
    subtitle?: string;
    userName?: string;
    accountName?: (row: IndexableRow) => string;
  } = {},
) {
  await downloadTrackerPDF(rows, INDEXABLE_PDF_CONFIG, filename, opts);
}

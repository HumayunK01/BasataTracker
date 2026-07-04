import type { FaxRow } from "@/hooks/useFaxTracker";
import { downloadTrackerPDF, FAX_PDF_CONFIG } from "./tracker-utils";

export async function downloadFaxPDF(
  rows: FaxRow[],
  filename = FAX_PDF_CONFIG.defaultFilename,
  opts: {
    subtitle?: string;
    userName?: string;
    accountName?: (row: FaxRow) => string;
  } = {},
) {
  await downloadTrackerPDF(rows, FAX_PDF_CONFIG, filename, opts);
}

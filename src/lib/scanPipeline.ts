import { isOfflineMode } from "@/lib/connectionMode";
import { emptyScanContact, type ScanContact } from "@/lib/scanResult";
import { runBrowserOcr } from "@/lib/browserOcr";
import { storeScanSession } from "@/lib/scanSession";

export type ScanProgress = {
  progress: number;
  message: string;
};

export type ScanExtractionResult = {
  contact: ScanContact;
  rawText?: string;
  ocrWarning?: string;
};

function isOfflineScanContext(): boolean {
  if (isOfflineMode()) return true;
  return typeof navigator !== "undefined" && !navigator.onLine;
}

async function runBrowserTesseract(
  file: File,
  onProgress?: (update: ScanProgress) => void,
  progressMessage = "Running on-device OCR…",
): Promise<ScanExtractionResult> {
  onProgress?.({ progress: 55, message: progressMessage });
  const fallback = await runBrowserOcr(file);
  onProgress?.({ progress: 100, message: "Extraction complete" });
  return {
    contact: fallback.contact,
    rawText: fallback.rawText,
    ocrWarning: fallback.ocrWarning,
  };
}

/** Run OCR on the image file as-is (no crop). Returns parsed contact + raw text. */
export async function extractContactFromImage(
  file: File,
  onProgress?: (update: ScanProgress) => void,
): Promise<ScanExtractionResult> {
  const offlineMsg = isOfflineScanContext()
    ? "No internet — running on-device OCR…"
    : "Running on-device OCR…";
  onProgress?.({ progress: 20, message: offlineMsg });
  try {
    return await runBrowserTesseract(file, onProgress);
  } catch (browserErr) {
    console.error("Browser OCR failed:", browserErr);
    return {
      contact: emptyScanContact(),
      ocrWarning:
        "Could not read this image. Try better lighting or enter details manually.",
    };
  }
}

export async function scanFileAndStore(
  file: File,
  imageDataUrl: string,
  onProgress?: (update: ScanProgress) => void,
): Promise<ScanExtractionResult> {
  const result = await extractContactFromImage(file, onProgress);
  storeScanSession(result.contact, imageDataUrl, {
    rawText: result.rawText,
    ocrWarning: result.ocrWarning,
  });
  return result;
}

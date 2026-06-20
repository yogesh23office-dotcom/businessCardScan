import { createWorker, type Worker } from "tesseract.js";
import type { ScanContact } from "./scanResult";
import { parseOcrText } from "./scanParser";
import { preprocessForOCR } from "./cardFrameAnalysis";

import workerPath from "tesseract.js/dist/worker.min.js?url";
import corePath from "tesseract.js-core/tesseract-core.wasm.js?url";

/** Directory URL for eng.traineddata (public/tessdata, copied to dist on build). */
function getLangPath(): string {
  if (typeof window === "undefined") {
    return "/tessdata";
  }
  const base = import.meta.env.BASE_URL || "/";
  const path = `${base.replace(/\/$/, "")}/tessdata`.replace(/^\//, "");
  return `${window.location.origin}/${path}`;
}

function resolveBundledAsset(importedUrl: string): string {
  if (typeof window === "undefined") {
    return importedUrl;
  }
  if (/^https?:\/\//i.test(importedUrl)) {
    return importedUrl;
  }
  return new URL(importedUrl, window.location.origin).href;
}

async function createTesseractWorker(): Promise<Worker> {
  return createWorker("eng", 1, {
    workerPath: resolveBundledAsset(workerPath),
    corePath: resolveBundledAsset(corePath),
    langPath: getLangPath(),
    gzip: false,
    cacheMethod: "refresh",
    logger: () => undefined,
  });
}

/** Grayscale + contrast boost for Tesseract only — keeps stored/preview images in color. */
async function fileForOcr(file: File): Promise<File | Blob> {
  if (typeof document === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  preprocessForOCR(canvas);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.92);
  });
}

export async function runBrowserOcr(
  file: File,
): Promise<{ contact: ScanContact; rawText: string; ocrWarning?: string }> {
  let worker: Worker | null = null;
  try {
    worker = await createTesseractWorker();
    const ocrInput = await fileForOcr(file);
    const { data } = await worker.recognize(ocrInput);
    await worker.terminate();
    worker = null;

    const rawText = data.text?.trim() || "";
    if (!rawText) {
      return {
        contact: parseOcrText(rawText),
        rawText,
        ocrWarning: "Browser OCR ran, but could not extract any text.",
      };
    }

    return {
      contact: parseOcrText(rawText),
      rawText,
    };
  } catch (error) {
    console.warn("Browser OCR failed:", error);
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore cleanup errors
      }
    }
    const detail =
      import.meta.env.DEV && error instanceof Error
        ? ` (${error.message})`
        : "";
    return {
      contact: parseOcrText(""),
      rawText: "",
      ocrWarning: `Offline scan failed.${detail} Enter details manually, or check that /tessdata/eng.traineddata loads.`,
    };
  }
}

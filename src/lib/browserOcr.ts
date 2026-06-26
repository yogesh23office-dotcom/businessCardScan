import { createWorker, PSM, type Worker } from "tesseract.js";
import type { ScanContact } from "./scanResult";
import { parseOcrText } from "./scanParser";
import { preprocessForOCR } from "./cardFrameAnalysis";

import workerPath from "tesseract.js/dist/worker.min.js?url";
import corePath from "tesseract.js-core/tesseract-core.wasm.js?url";

/** Minimum width for Tesseract — mobile card crops are often too small without upscaling. */
const OCR_MIN_WIDTH = 2000;

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

type OcrPass = { psm: PSM; label: string };

const OCR_PASSES: OcrPass[] = [
  { psm: PSM.AUTO, label: "auto" },
  { psm: PSM.SINGLE_BLOCK, label: "block" },
  { psm: PSM.SPARSE_TEXT, label: "sparse" },
];

async function createTesseractWorker(): Promise<Worker> {
  const worker = await createWorker("eng", 1, {
    workerPath: resolveBundledAsset(workerPath),
    corePath: resolveBundledAsset(corePath),
    langPath: getLangPath(),
    gzip: false,
    cacheMethod: "refresh",
    logger: () => undefined,
  });
  await worker.setParameters({
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });
  return worker;
}

function scoreOcrResult(text: string, confidence: number): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 1);
  const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed);
  const hasPhone = /\d{7,}/.test(trimmed);
  let score = trimmed.length * 0.4 + lines.length * 12 + confidence * 0.6;
  if (hasEmail) score += 40;
  if (hasPhone) score += 25;
  return score;
}

/** Grayscale + contrast boost for Tesseract only — keeps stored/preview images in color. */
async function fileForOcr(file: File): Promise<File | Blob> {
  if (typeof document === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(3.5, Math.max(1, OCR_MIN_WIDTH / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.imageSmoothingEnabled = scale > 1;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  preprocessForOCR(canvas);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/png");
  });
}

async function recognizeWithPasses(
  worker: Worker,
  ocrInput: File | Blob,
): Promise<{ text: string; confidence: number }> {
  let bestText = "";
  let bestScore = 0;
  let bestConfidence = 0;

  for (const pass of OCR_PASSES) {
    await worker.setParameters({ tessedit_pageseg_mode: pass.psm });
    const { data } = await worker.recognize(ocrInput);
    const text = data.text?.trim() || "";
    const confidence = data.confidence ?? 0;
    const score = scoreOcrResult(text, confidence);
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
      bestConfidence = confidence;
    }
  }

  return { text: bestText, confidence: bestConfidence };
}

export async function runBrowserOcr(
  file: File,
): Promise<{ contact: ScanContact; rawText: string; ocrWarning?: string }> {
  let worker: Worker | null = null;
  try {
    worker = await createTesseractWorker();
    const ocrInput = await fileForOcr(file);
    const { text: rawText } = await recognizeWithPasses(worker, ocrInput);
    await worker.terminate();
    worker = null;

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

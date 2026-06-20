/** Laplacian variance sharpness score for a video frame region (higher = sharper). */
export function measureFrameSharpness(
  video: HTMLVideoElement,
  region: { x: number; y: number; w: number; h: number },
): number {
  if (video.videoWidth === 0 || video.videoHeight === 0) return 0;

  const sampleW = 120;
  const sampleH = 75;
  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const sx = region.x * video.videoWidth;
  const sy = region.y * video.videoHeight;
  const sw = region.w * video.videoWidth;
  const sh = region.h * video.videoHeight;

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sampleW, sampleH);
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

  const gray = new Float32Array(sampleW * sampleH);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4;
    gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < sampleH - 1; y++) {
    for (let x = 1; x < sampleW - 1; x++) {
      const idx = y * sampleW + x;
      const lap =
        -4 * gray[idx] +
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - sampleW] +
        gray[idx + sampleW];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/** Apply OCR preprocessing: grayscale → contrast enhancement → deskew hint. */
export function preprocessForOCR(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext("2d");
  if (!ctx) return ctx!.createImageData(canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Grayscale + contrast enhancement
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Stretch contrast: increase diff from 128 (midpoint)
    const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.3 + 128));
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }

  ctx.putImageData(imageData, 0, 0);
  return imageData;
}

/** ISO 7810 ID-1 business card aspect (85.6 × 53.98 mm). */
export const CARD_ASPECT = 1.586;

/** Legacy normalized region — prefer `getCenteredCardCropRegion` for capture/analysis. */
export const CARD_FRAME = { x: 0.06, y: 0.34, w: 0.88, h: 0.31 };

export const ALIGN_MIN_SHARPNESS = 25;
export const AUTO_CAPTURE_SHARPNESS = 70;
export const AUTO_CAPTURE_STABLE_READINGS = 4;
/** Min card-likeness score (0–100) before auto-capture is allowed. */
export const CARD_DETECT_MIN_SCORE = 42;

export type NormalizedRegion = { x: number; y: number; w: number; h: number };

/**
 * Map the on-screen centered card guide to source-video coordinates (object-cover).
 * Returns normalized 0–1 crop rect matching the UI frame.
 */
export function getCenteredCardCropRegion(
  video: HTMLVideoElement,
  maxGuideWidthPx = 440,
): NormalizedRegion {
  const { videoWidth, videoHeight } = video;
  const displayW = video.clientWidth || videoWidth;
  const displayH = video.clientHeight || videoHeight;

  if (!videoWidth || !videoHeight || !displayW || !displayH) {
    return CARD_FRAME;
  }

  const scale = Math.max(displayW / videoWidth, displayH / videoHeight);
  const renderedW = videoWidth * scale;
  const renderedH = videoHeight * scale;
  const offsetX = (displayW - renderedW) / 2;
  const offsetY = (displayH - renderedH) / 2;

  const guideW = Math.min(displayW * 0.88, maxGuideWidthPx);
  const guideH = guideW / CARD_ASPECT;
  const guideX = (displayW - guideW) / 2;
  const guideY = (displayH - guideH) / 2;

  let sx = (guideX - offsetX) / scale;
  let sy = (guideY - offsetY) / scale;
  let sw = guideW / scale;
  let sh = guideH / scale;

  sx = Math.max(0, sx);
  sy = Math.max(0, sy);
  sw = Math.min(sw, videoWidth - sx);
  sh = Math.min(sh, videoHeight - sy);

  return {
    x: sx / videoWidth,
    y: sy / videoHeight,
    w: sw / videoWidth,
    h: sh / videoHeight,
  };
}

/** Card presence: edge density + inner/outer contrast (0–100). */
export function measureCardPresence(
  video: HTMLVideoElement,
  region: NormalizedRegion,
): number {
  if (video.videoWidth === 0 || video.videoHeight === 0) return 0;

  const sampleW = 96;
  const sampleH = Math.max(48, Math.round(sampleW / CARD_ASPECT));
  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const sx = region.x * video.videoWidth;
  const sy = region.y * video.videoHeight;
  const sw = region.w * video.videoWidth;
  const sh = region.h * video.videoHeight;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sampleW, sampleH);

  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
  const gray = new Float32Array(sampleW * sampleH);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4;
    gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  }

  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 1; y < sampleH - 1; y++) {
    for (let x = 1; x < sampleW - 1; x++) {
      const idx = y * sampleW + x;
      const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const gy = Math.abs(gray[idx + sampleW] - gray[idx - sampleW]);
      edgeSum += gx + gy;
      edgeCount++;
    }
  }
  const edgeDensity = edgeCount ? edgeSum / edgeCount : 0;

  const margin = Math.max(2, Math.floor(Math.min(sampleW, sampleH) * 0.12));
  let innerSum = 0;
  let innerCount = 0;
  let outerSum = 0;
  let outerCount = 0;

  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      const onBorder =
        x < margin || y < margin || x >= sampleW - margin || y >= sampleH - margin;
      const v = gray[y * sampleW + x];
      if (onBorder) {
        outerSum += v;
        outerCount++;
      } else {
        innerSum += v;
        innerCount++;
      }
    }
  }

  const innerMean = innerCount ? innerSum / innerCount : 0;
  const outerMean = outerCount ? outerSum / outerCount : 0;
  const contrast = Math.abs(innerMean - outerMean);

  const edgeScore = Math.min(55, (edgeDensity / 18) * 55);
  const contrastScore = Math.min(45, (contrast / 28) * 45);
  return Math.round(edgeScore + contrastScore);
}

export type AlignmentStatus = "searching" | "aligning" | "hold-steady" | "ready";

export function getAlignmentStatus(
  sharpness: number,
  stableCount: number,
  cardScore: number,
): AlignmentStatus {
  if (stableCount >= AUTO_CAPTURE_STABLE_READINGS && cardScore >= CARD_DETECT_MIN_SCORE) {
    return "ready";
  }
  if (stableCount >= Math.max(2, AUTO_CAPTURE_STABLE_READINGS - 1)) return "hold-steady";
  if (sharpness >= ALIGN_MIN_SHARPNESS && cardScore >= CARD_DETECT_MIN_SCORE * 0.65) {
    return "aligning";
  }
  return "searching";
}

export function getAlignmentProgress(
  sharpness: number,
  stableCount: number,
  cardScore: number,
): number {
  const sharpPct = Math.min(45, (sharpness / AUTO_CAPTURE_SHARPNESS) * 45);
  const cardPct = Math.min(35, (cardScore / CARD_DETECT_MIN_SCORE) * 35);
  const stablePct = Math.min(20, (stableCount / AUTO_CAPTURE_STABLE_READINGS) * 20);
  return Math.round(sharpPct + cardPct + stablePct);
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
}

export function pickDefaultFacingMode(): "environment" | "user" {
  // Laptops/desktops only have a front webcam — "environment" fails on Windows
  return isMobileDevice() ? "environment" : "user";
}

async function enumerateVideoInputs(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput" && d.deviceId);
  } catch {
    return [];
  }
}

export async function requestCameraStream(
  preferredFacing?: "environment" | "user",
): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera is not supported in this browser.");
  }

  if (!window.isSecureContext) {
    throw new Error("Camera requires HTTPS or localhost. Open the app at http://localhost:5173");
  }

  const facing = preferredFacing ?? pickDefaultFacingMode();
  const mobile = isMobileDevice();
  const attempts: MediaStreamConstraints[] = [];

  if (mobile) {
    // Mobile: rear camera first — { video: true } often opens the selfie cam
    attempts.push({ video: { facingMode: facing }, audio: false });
    attempts.push({ video: { facingMode: { ideal: facing } }, audio: false });
  } else {
    // Desktop: unconstrained first — works on most Windows laptops
    attempts.push({ video: true, audio: false });
  }

  // Try each physical camera by deviceId (after permission, labels may be available)
  const videoInputs = await enumerateVideoInputs();
  for (const device of videoInputs) {
    attempts.push({ video: { deviceId: { exact: device.deviceId } }, audio: false });
    attempts.push({ video: { deviceId: { ideal: device.deviceId } }, audio: false });
  }

  if (!mobile) {
    attempts.push({ video: { facingMode: { ideal: facing } }, audio: false });
    attempts.push({ video: { facingMode: facing }, audio: false });
  }

  if (mobile) {
    attempts.push({ video: true, audio: false });
  }

  let lastError: unknown;
  const seen = new Set<string>();

  for (const constraints of attempts) {
    const key = JSON.stringify(constraints);
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✓ Camera stream acquired with constraints:", constraints);
      return stream;
    } catch (err) {
      lastError = err;
      console.warn("✗ Camera attempt failed:", constraints, err);
    }
  }

  const name = lastError instanceof DOMException ? lastError.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    throw new Error(
      "Camera blocked. Click the camera icon in your browser address bar → Allow, then tap Try again.",
    );
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    throw new Error("No camera found. Use Choose from folder to upload a card photo.");
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    throw new Error("Camera is busy (Zoom/Teams may be using it). Close other apps and try again.");
  }
  if (name === "OverconstrainedError") {
    throw new Error("Camera settings not supported. Tap Try again — we will use a simpler mode.");
  }
  throw new Error("Could not open camera. Use Choose from folder or tap Try again.");
}

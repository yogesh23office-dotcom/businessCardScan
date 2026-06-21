import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera, Check, Loader2, SwitchCamera, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AUTO_CAPTURE_HOLD_MS,
  AUTO_CAPTURE_SHARPNESS,
  AUTO_CAPTURE_STABLE_READINGS,
  AUTO_CAPTURE_WARMUP_MS,
  ALIGN_MIN_SHARPNESS,
  CARD_ASPECT,
  CARD_DETECT_MIN_SCORE,
  getAlignmentProgress,
  getAlignmentStatus,
  getCenteredCardCropRegion,
  measureCardPresence,
  measureFrameSharpness,
  buildWebcamVideoConstraints,
  initialWebcamConstraintTier,
  isMobileDevice,
  pickDefaultFacingMode,
  type AlignmentStatus,
} from "@/lib/cardFrameAnalysis";
import { cn } from "@/lib/utils";

type CameraCaptureProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

type Phase = "live" | "preview";

const STATUS_COPY: Record<AlignmentStatus, { title: string; hint: string }> = {
  searching: {
    title: "Position your card",
    hint: "Center the card inside the frame",
  },
  aligning: {
    title: "Card detected",
    hint: "Hold steady and move closer if needed",
  },
  "hold-steady": {
    title: "Almost ready",
    hint: "Keep the card still in the frame",
  },
  ready: {
    title: "Capturing…",
    hint: "Card locked — taking photo",
  },
};

type ConstraintTier = 0 | 1 | 2;

function mapCameraError(err: string | DOMException): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera blocked. Click the camera icon in your browser address bar → Allow, then tap Try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera found. Use Choose from folder to upload a card photo.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Camera is busy (Zoom/Teams may be using it). Close other apps and try again.";
  }
  if (name === "OverconstrainedError") {
    return "Camera settings not supported. Tap Try again — we will use a simpler mode.";
  }
  if (typeof err === "string" && err.trim()) return err;
  return "Could not access the camera.";
}

function canvasToJpegFile(canvas: HTMLCanvasElement, name: string): File | null {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const byteString = atob(dataUrl.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return new File([ab], name, { type: "image/jpeg" });
}

export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const phaseRef = useRef<Phase>("live");
  const facingModeRef = useRef<"environment" | "user">(pickDefaultFacingMode());
  const stableCountRef = useRef(0);
  const analysisTimerRef = useRef<number | null>(null);
  const triggerCaptureRef = useRef<() => void>(() => {});
  const streamReadyAtRef = useRef(0);
  const readyHoldStartedAtRef = useRef<number | null>(null);
  const autoCaptureLockedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("live");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(pickDefaultFacingMode());
  const [cameraKey, setCameraKey] = useState(0);
  const [constraintTier, setConstraintTier] = useState<ConstraintTier>(initialWebcamConstraintTier);
  const [sharpness, setSharpness] = useState(0);
  const [cardScore, setCardScore] = useState(0);
  const [stableCount, setStableCount] = useState(0);
  const [alignmentStatus, setAlignmentStatus] = useState<AlignmentStatus>("searching");
  const [streamReady, setStreamReady] = useState(false);

  phaseRef.current = phase;
  facingModeRef.current = facingMode;

  const getVideo = useCallback(() => webcamRef.current?.video ?? null, []);

  const stopAnalysis = useCallback(() => {
    if (analysisTimerRef.current) {
      window.clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
  }, []);

  const resetLiveMetrics = useCallback(() => {
    stableCountRef.current = 0;
    readyHoldStartedAtRef.current = null;
    autoCaptureLockedRef.current = false;
    setStreamReady(false);
    setStableCount(0);
    setSharpness(0);
    setCardScore(0);
    setAlignmentStatus("searching");
  }, []);

  /** Capture only the centered card frame — not the full camera view. */
  const snapFrame = useCallback((): File | null => {
    const video = getVideo();
    if (!video || video.videoWidth === 0) return null;

    const region = getCenteredCardCropRegion(video);
    const sx = Math.round(region.x * video.videoWidth);
    const sy = Math.round(region.y * video.videoHeight);
    const sw = Math.round(region.w * video.videoWidth);
    const sh = Math.round(region.h * video.videoHeight);
    if (sw <= 0 || sh <= 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    return canvasToJpegFile(canvas, `card-capture-${Date.now()}.jpg`);
  }, [getVideo]);

  const enterPreview = useCallback(
    (file: File) => {
      stopAnalysis();
      setCapturedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      phaseRef.current = "preview";
      setPhase("preview");
    },
    [stopAnalysis],
  );

  const triggerCapture = useCallback(() => {
    if (phaseRef.current !== "live" || autoCaptureLockedRef.current) return;
    autoCaptureLockedRef.current = true;
    const file = snapFrame();
    if (file) enterPreview(file);
    else autoCaptureLockedRef.current = false;
  }, [snapFrame, enterPreview]);

  triggerCaptureRef.current = triggerCapture;

  const startAnalysisLoop = useCallback(() => {
    stopAnalysis();
    analysisTimerRef.current = window.setInterval(() => {
      if (phaseRef.current !== "live") return;

      const video = getVideo();
      if (!video) return;

      const region = getCenteredCardCropRegion(video);
      const score = measureFrameSharpness(video, region);
      const presence = measureCardPresence(video, region);

      setSharpness(Math.round(score));
      setCardScore(presence);

      const cardDetected = presence >= CARD_DETECT_MIN_SCORE;
      const sharpEnough = score >= AUTO_CAPTURE_SHARPNESS;
      const warmedUp =
        streamReadyAtRef.current > 0 &&
        Date.now() - streamReadyAtRef.current >= AUTO_CAPTURE_WARMUP_MS;

      if (cardDetected && sharpEnough && warmedUp) {
        stableCountRef.current += 1;
        setStableCount(stableCountRef.current);
      } else if (cardDetected && score >= ALIGN_MIN_SHARPNESS && warmedUp) {
        stableCountRef.current = Math.max(0, stableCountRef.current - 1);
        setStableCount(stableCountRef.current);
        readyHoldStartedAtRef.current = null;
      } else {
        stableCountRef.current = 0;
        setStableCount(0);
        readyHoldStartedAtRef.current = null;
      }

      const status = getAlignmentStatus(score, stableCountRef.current, presence);
      setAlignmentStatus(status);

      const readyForHold =
        warmedUp &&
        stableCountRef.current >= AUTO_CAPTURE_STABLE_READINGS &&
        cardDetected &&
        sharpEnough;

      if (readyForHold) {
        if (readyHoldStartedAtRef.current === null) {
          readyHoldStartedAtRef.current = Date.now();
          setAlignmentStatus("ready");
        } else if (Date.now() - readyHoldStartedAtRef.current >= AUTO_CAPTURE_HOLD_MS) {
          setAlignmentStatus("ready");
          triggerCaptureRef.current();
        }
      }
    }, 450);
  }, [stopAnalysis, getVideo]);

  const handleUserMedia = useCallback(() => {
    setIsStarting(false);
    setError(null);
    streamReadyAtRef.current = Date.now();
    setStreamReady(true);
    startAnalysisLoop();
  }, [startAnalysisLoop]);

  const handleUserMediaError = useCallback(
    (err: string | DOMException) => {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "OverconstrainedError" && constraintTier > 0) {
        setConstraintTier((tier) => (tier - 1) as ConstraintTier);
        setIsStarting(true);
        setStreamReady(false);
        setCameraKey((key) => key + 1);
        return;
      }
      if (name === "OverconstrainedError" && constraintTier === 0 && !isMobileDevice()) {
        setConstraintTier(1);
        setIsStarting(true);
        setStreamReady(false);
        setCameraKey((key) => key + 1);
        return;
      }

      setIsStarting(false);
      setStreamReady(false);
      setError(mapCameraError(err));
      stopAnalysis();
    },
    [stopAnalysis, constraintTier],
  );

  const restartCamera = useCallback(() => {
    stopAnalysis();
    resetLiveMetrics();
    setError(null);
    setConstraintTier(initialWebcamConstraintTier());
    setIsStarting(true);
    setCameraKey((key) => key + 1);
  }, [stopAnalysis, resetLiveMetrics]);

  useEffect(() => {
    if (!open) {
      stopAnalysis();
      setPhase("live");
      phaseRef.current = "live";
      setPreviewUrl(null);
      setCapturedFile(null);
      setError(null);
      setConstraintTier(initialWebcamConstraintTier());
      resetLiveMetrics();
      return;
    }

    if (!window.isSecureContext) {
      setError("Camera requires HTTPS or localhost. Open the app at http://localhost:5173");
      setIsStarting(false);
      return;
    }

    if (phaseRef.current === "live") {
      setConstraintTier(initialWebcamConstraintTier());
      setIsStarting(true);
    }
  }, [open, stopAnalysis, resetLiveMetrics]);

  const handleFlipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    facingModeRef.current = next;
    if (open && phaseRef.current === "live") {
      stopAnalysis();
      resetLiveMetrics();
      setConstraintTier(initialWebcamConstraintTier());
      setIsStarting(true);
      setCameraKey((key) => key + 1);
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedFile(null);
    setPhase("live");
    phaseRef.current = "live";
    restartCamera();
  };

  const handleContinue = () => {
    if (!capturedFile) return;
    onCapture(capturedFile);
    onClose();
  };

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    stopAnalysis();
    onClose();
  };

  if (!open) return null;

  const statusCopy = STATUS_COPY[alignmentStatus];
  const alignmentProgress = getAlignmentProgress(sharpness, stableCount, cardScore);
  const cardDetected = cardScore >= CARD_DETECT_MIN_SCORE * 0.65;
  const canManualCapture = streamReady && !isStarting && !error;

  const videoConstraints = buildWebcamVideoConstraints(facingMode, constraintTier);
  const cameraLabel = facingMode === "environment" ? "Back camera" : "Front camera";
  const flipCameraLabel =
    facingMode === "environment" ? "Switch to front camera" : "Switch to back camera";

  const frameBorderClass =
    alignmentStatus === "ready"
      ? "border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.45)]"
      : alignmentStatus === "hold-steady"
        ? "border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.35)]"
        : cardDetected
          ? "border-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.3)]"
          : "border-white/80";

  const progressBarClass =
    alignmentStatus === "ready" || alignmentStatus === "hold-steady"
      ? "bg-emerald-400"
      : cardDetected
        ? "bg-amber-300"
        : "bg-white/50";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" role="dialog" aria-modal="true">
      <div className="relative flex-1 overflow-hidden">
        {phase === "live" ? (
          <>
            {!error && (
              <Webcam
                key={`${facingMode}-${constraintTier}-${cameraKey}`}
                ref={webcamRef}
                audio={false}
                mirrored={facingMode === "user"}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                forceScreenshotSourceSize
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                className={cn("h-full w-full object-cover", (isStarting || error) && "opacity-0")}
              />
            )}

            {isStarting && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-white">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm font-medium">Opening camera…</span>
                <span className="text-xs text-white/60">Please allow camera access if prompted</span>
              </div>
            )}

            {error && !isStarting && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black px-8 text-center text-white">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold">Camera unavailable</p>
                  <p className="text-sm text-white/70">{error}</p>
                </div>
                <div className="flex w-full max-w-xs flex-col gap-2">
                  <Button className="w-full rounded-xl" onClick={restartCamera}>
                    Try again
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={handleClose}>
                    Use folder upload instead
                  </Button>
                </div>
              </div>
            )}

            {!error && !isStarting && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={cn(
                      "relative rounded-2xl border-[2.5px] transition-all duration-300",
                      frameBorderClass,
                    )}
                    style={{
                      width: "min(88vw, 440px)",
                      aspectRatio: CARD_ASPECT,
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
                    }}
                  >
                    {(
                      [
                        "top-0 left-0 -translate-x-px -translate-y-px border-l-[3px] border-t-[3px] rounded-tl-lg",
                        "top-0 right-0 translate-x-px -translate-y-px border-r-[3px] border-t-[3px] rounded-tr-lg",
                        "bottom-0 left-0 -translate-x-px translate-y-px border-l-[3px] border-b-[3px] rounded-bl-lg",
                        "bottom-0 right-0 translate-x-px translate-y-px border-r-[3px] border-b-[3px] rounded-br-lg",
                      ] as const
                    ).map((cornerClass) => (
                      <div
                        key={cornerClass}
                        className={cn("absolute h-8 w-8 border-inherit", cornerClass)}
                        style={{ borderColor: "inherit" }}
                      />
                    ))}
                  </div>
                </div>

                <div className="absolute inset-x-0 top-0 z-10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
                  <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 backdrop-blur-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-full text-white hover:bg-white/15"
                      onClick={handleClose}
                      aria-label="Close camera"
                    >
                      <X className="h-5 w-5" />
                    </Button>

                    <div className="min-w-0 flex-1 text-center">
                      <p className="truncate text-sm font-semibold text-white">{statusCopy.title}</p>
                      <p className="mt-0.5 truncate text-xs text-white/75">{statusCopy.hint}</p>
                      {isMobileDevice() && streamReady && (
                        <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-cyan-300/90">
                          {cameraLabel}
                        </p>
                      )}
                      <div className="mx-auto mt-2 h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-white/20">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", progressBarClass)}
                          style={{ width: `${alignmentProgress}%` }}
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      className={cn(
                        "h-9 shrink-0 rounded-full text-white hover:bg-white/15",
                        isMobileDevice() ? "gap-1 px-2.5" : "w-9 px-0",
                      )}
                      onClick={handleFlipCamera}
                      aria-label={flipCameraLabel}
                      title={flipCameraLabel}
                    >
                      <SwitchCamera className="h-5 w-5 shrink-0" />
                      {isMobileDevice() && (
                        <span className="text-[10px] font-semibold leading-none">
                          {facingMode === "environment" ? "Front" : "Back"}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-20">
                  <p className="mb-5 text-center text-sm font-medium text-white/85">
                    Only the framed area is captured
                  </p>
                  <p className="mb-5 text-center text-xs text-white/55">
                    Auto-captures when a card is steady in frame · or tap the button below
                  </p>
                  {isMobileDevice() && (
                    <p className="mb-4 text-center text-xs text-cyan-200/80">
                      Wrong camera? Tap <span className="font-semibold">Back</span> (top-right) for rear camera
                    </p>
                  )}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={triggerCapture}
                      disabled={!canManualCapture}
                      className={cn(
                        "relative flex h-[76px] w-[76px] items-center justify-center rounded-full transition-all",
                        canManualCapture
                          ? "hover:scale-105 active:scale-95"
                          : "opacity-45 cursor-not-allowed",
                      )}
                      aria-label="Capture manually"
                    >
                      <span className="absolute inset-0 rounded-full border-[3px] border-white/90" />
                      <span
                        className={cn(
                          "flex h-[60px] w-[60px] items-center justify-center rounded-full",
                          canManualCapture ? "bg-white" : "bg-white/40",
                        )}
                      >
                        <Camera className={cn("h-7 w-7", canManualCapture ? "text-black" : "text-white/70")} />
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {previewUrl && (
              <img src={previewUrl} alt="Captured card preview" className="h-full w-full object-contain bg-black" />
            )}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 pb-6 pt-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
              <p className="text-sm font-medium text-white">Review capture</p>
              <div className="w-10" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex gap-3 bg-gradient-to-t from-black/90 to-transparent px-4 pb-8 pt-12">
              <Button variant="outline" className="flex-1 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={handleRetake}>
                Retake
              </Button>
              <Button className="flex-1 rounded-xl bg-gradient-primary shadow-glow" onClick={handleContinue}>
                <Check className="mr-2 h-4 w-4" /> Continue
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

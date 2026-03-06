"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { extractOwnerName, isNameMatchFromOcr } from "@/lib/account-verification";

type CameraStatus = "permission" | "loading" | "ready" | "scanning" | "error" | "denied";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountNumber = searchParams.get("account")?.trim() ?? "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>("permission");
  const [errorMessage, setErrorMessage] = useState("");

  const [accountOwnerName, setAccountOwnerName] = useState("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [accountLoadError, setAccountLoadError] = useState<string | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [ocrPreviewText, setOcrPreviewText] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        "Camera is only available in a secure context. Please open this site over HTTPS (or localhost on your computer).",
      );
      setStatus("error");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not access camera";
      setErrorMessage(message);
      setStatus(error instanceof Error && message.toLowerCase().includes("denied") ? "denied" : "error");
    }
  }, [stopCamera]);

  const runNameVerification = useCallback(
    async (image: File | Blob) => {
      if (!accountOwnerName) {
        setVerificationMessage("Owner name is not available for this account.");
        setIsVerified(false);
        return;
      }

      setIsVerifying(true);
      setVerificationMessage(null);
      setOcrPreviewText("");

      try {
        const { recognize } = await import("tesseract.js");
        const result = await recognize(image, "eng");
        const text = result.data.text ?? "";
        setOcrPreviewText(text.trim());

        const matched = isNameMatchFromOcr(accountOwnerName, text);
        setIsVerified(matched);

        if (matched) {
          setVerificationMessage("Verification successful. ID name matches the account owner.");
        } else {
          setVerificationMessage("Name mismatch. Please retry with a clearer ID image.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "OCR failed";
        setVerificationMessage(`Failed to verify ID: ${message}`);
        setIsVerified(false);
      } finally {
        setIsVerifying(false);
      }
    },
    [accountOwnerName],
  );

  const captureAndVerify = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setVerificationMessage("Camera is not ready. Please wait and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setVerificationMessage("Failed to capture frame from camera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.95);
    });

    if (!blob) {
      setVerificationMessage("Failed to capture image for verification.");
      return;
    }

    await runNameVerification(blob);
  }, [runNameVerification]);

  useEffect(() => {
    if (!accountNumber) return;

    const controller = new AbortController();

    const loadAccount = async () => {
      setIsLoadingAccount(true);
      setAccountLoadError(null);

      try {
        // use relative path so we go through the Next.js proxy in dev
        const response = await fetch(`/api/v1/accounts/${encodeURIComponent(accountNumber)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error((await response.text()) || response.statusText);
        }

        const data = await response.json();
        const ownerName = extractOwnerName(data);

        if (!ownerName) {
          throw new Error("No owner name found in account data.");
        }

        setAccountOwnerName(ownerName);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Failed to load account";
        setAccountLoadError(message);
        toast.error(`Account Error: ${message}`);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAccount(false);
        }
      }
    };

    loadAccount();

    return () => controller.abort();
  }, [accountNumber]);

  useEffect(() => {
    if (status !== "ready") return;

    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const onCanPlay = () => setStatus("scanning");
    const onError = () => setStatus("error");

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.play().catch(() => {});

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [status]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Auto-redirect on successful verification
  useEffect(() => {
    if (isVerified) {
      const timeout = setTimeout(() => {
        router.push(`/verify-customer?account=${encodeURIComponent(accountNumber)}&verified=1`);
      }, 1500); // Give user 1.5 seconds to see the success message
      return () => clearTimeout(timeout);
    }
  }, [isVerified, accountNumber, router]);

  if (!accountNumber) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center text-slate-200">
        No account number provided. Return to the home page and enter an account number first.
      </div>
    );
  }

  const canContinue = isVerified && !isLoadingAccount && !accountLoadError;

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col bg-slate-900">
      <header className="relative z-20 flex min-h-[56px] items-center justify-between border-b-2 border-blue-500 bg-slate-900/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <Link href="/" className="text-base font-medium text-slate-300 transition-colors hover:text-white">
          ← Back
        </Link>
        <h1 className="text-lg font-bold text-white sm:text-xl">ID Verification</h1>
        <div className="w-16" />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-2 sm:p-4">
        <div className="mb-6 w-full max-w-4xl rounded-xl border-2 border-blue-500/30 bg-slate-800/70 px-5 py-4 text-base text-slate-200">
          <p>
            Account: <span className="font-bold text-white">{accountNumber}</span>
          </p>
          {isLoadingAccount ? (
            <p className="mt-2 text-slate-300 font-medium">Loading account owner information...</p>
          ) : accountLoadError ? (
            <p className="mt-2 text-red-300 font-medium">{accountLoadError}</p>
          ) : (
            <p className="mt-2 text-slate-300">
              Expected owner name: <span className="font-bold text-white">{accountOwnerName}</span>
            </p>
          )}
        </div>

        {status === "permission" && (
          <div className="flex max-w-md flex-col items-center gap-6 rounded-2xl border-2 border-blue-500/30 bg-slate-800/90 p-8 text-center backdrop-blur-sm">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white">Camera Access Needed</h2>
              <p className="text-base leading-relaxed text-slate-300">
                Allow camera access to scan your ID and verify the name against the account owner.
              </p>
              <p className="text-sm leading-relaxed text-blue-300 font-medium">
                📱 Please hold your device in <span className="font-bold">portrait mode</span> for best results.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg transition-colors hover:bg-blue-500 active:scale-[0.98]"
              disabled={isLoadingAccount || Boolean(accountLoadError)}
            >
              🔐 Allow Camera Access
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="h-16 w-16 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
            <p className="text-lg font-semibold text-slate-300">Opening camera...</p>
          </div>
        )}

        {status === "denied" && (
          <div className="flex max-w-sm flex-col items-center gap-6 rounded-2xl border-2 border-red-500/30 bg-slate-800/80 p-8 text-center backdrop-blur-sm">
            <div className="text-4xl">❌</div>
            <div>
              <p className="text-lg font-bold text-white">Camera Access Denied</p>
              <p className="text-slate-300 text-base mt-2">Please enable camera permissions in your device settings to continue.</p>
            </div>
            <button
              type="button"
              onClick={() => setStatus("permission")}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white hover:bg-blue-500"
            >
              Try Again
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex max-w-sm flex-col items-center gap-6 rounded-2xl border-2 border-orange-500/30 bg-slate-800/80 p-8 text-center backdrop-blur-sm">
            <div className="text-4xl">⚠️</div>
            <div>
              <p className="text-lg font-bold text-white">Could Not Start Camera</p>
              <p className="text-slate-300 text-base mt-2">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setStatus("permission")}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white hover:bg-blue-500"
            >
              Try Again
            </button>
          </div>
        )}

        {(status === "ready" || status === "scanning") && (
          <div className="flex w-full max-w-4xl min-h-0 flex-1 flex-col gap-3 sm:gap-4">
            <div className="relative h-[75vh] max-h-[75vh] w-full flex-shrink-0 overflow-hidden rounded-xl bg-black sm:rounded-2xl">
              <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 sm:p-4">
                {/* ID Guide Frame - Philippine ID Aspect Ratio (85.6x53.98mm ~ 16:10) */}
                <div className="relative w-full max-w-md rounded-lg border-4 border-blue-400 bg-black/30" style={{ aspectRatio: '1.6 / 1' }}>
                  {/* Corner markers */}
                  <div className="absolute left-3 top-3 h-8 w-8 border-l-3 border-t-3 border-blue-400" />
                  <div className="absolute right-3 top-3 h-8 w-8 border-r-3 border-t-3 border-blue-400" />
                  <div className="absolute bottom-3 left-3 h-8 w-8 border-l-3 border-b-3 border-blue-400" />
                  <div className="absolute bottom-3 right-3 h-8 w-8 border-r-3 border-b-3 border-blue-400" />
                  
                  {/* Center instructions */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white">
                    <svg className="h-14 w-14 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v6H7z" />
                    </svg>
                    <div>
                      <span className="text-base font-bold">Position ID card here</span>
                      <p className="text-sm text-blue-200 mt-1">Keep name clearly visible</p>
                    </div>
                  </div>
                </div>

                {/* Bottom instruction */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                  <div className="rounded-lg bg-black/80 px-4 py-2.5 text-sm text-blue-200 backdrop-blur-sm font-medium">
                    Hold device in portrait mode, ensure good lighting
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-4xl flex-shrink-0 gap-3 sm:gap-4">
              <label className="flex min-h-14 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl border-2 border-slate-500 bg-slate-700 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-slate-600 active:scale-[0.98]">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await runNameVerification(file);
                    event.target.value = "";
                  }}
                  disabled={isVerifying || isLoadingAccount || Boolean(accountLoadError)}
                />
                📤 Upload ID
              </label>

              <button
                type="button"
                onClick={captureAndVerify}
                disabled={isVerifying || isLoadingAccount || Boolean(accountLoadError)}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-blue-500 bg-blue-600 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                📷 {isVerifying ? "Verifying..." : "Capture & Verify"}
              </button>

              {!isVerified && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/verify-customer?account=${encodeURIComponent(accountNumber)}&verified=1`)
                  }
                  disabled={!canContinue}
                  className="flex min-h-14 flex-1 items-center justify-center rounded-xl bg-emerald-600 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue →
                </button>
              )}

              {isVerified && (
                <div className="flex min-h-14 flex-1 items-center justify-center rounded-xl bg-emerald-600 py-4 text-base font-bold text-white">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Redirecting...
                  </div>
                </div>
              )}
            </div>

            {verificationMessage && (
              <p className={`text-center text-base font-semibold ${isVerified ? "text-emerald-300" : "text-amber-300"}`}>
                {verificationMessage}
              </p>
            )}

            {ocrPreviewText && (
              <p className="rounded-lg border border-white/10 bg-slate-800/80 p-4 text-sm text-slate-300">
                <span className="font-semibold">OCR Preview:</span> {ocrPreviewText.slice(0, 220)}{ocrPreviewText.length > 220 ? "..." : ""}
              </p>
            )}
          </div>
        )}

        {/* Processing/Loading Screen */}
        {isVerifying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-slate-800 p-8 text-center max-w-sm">
              <div className="relative h-20 w-20">
                <div className="absolute inset-0 rounded-full border-4 border-slate-600 border-t-blue-500 animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Processing ID</h2>
                <p className="text-slate-300 text-base">Analyzing your ID card...</p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Success Screen */}
        {isVerified && !isVerifying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <style>{`
              @keyframes scaleIn {
                0% {
                  transform: scale(0);
                  opacity: 0;
                }
                50% {
                  transform: scale(1.1);
                }
                100% {
                  transform: scale(1);
                  opacity: 1;
                }
              }
              @keyframes checkmarkDraw {
                0% {
                  stroke-dashoffset: 50;
                }
                100% {
                  stroke-dashoffset: 0;
                }
              }
              .checkmark-circle {
                animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
              }
              .checkmark-path {
                animation: checkmarkDraw 0.5s ease-in-out 0.3s forwards;
                stroke-dasharray: 50;
                stroke-dashoffset: 50;
              }
            `}</style>
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-slate-800 p-8 text-center max-w-sm">
              {/* Animated Checkmark Circle */}
              <svg
                className="checkmark-circle h-24 w-24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" className="text-emerald-400" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
                <path className="checkmark-path" d="M8 12l2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Verification Complete</h2>
                <p className="text-emerald-300 text-lg font-semibold">✓ ID name matches account owner</p>
                <p className="text-slate-400 text-base mt-3">Redirecting to next step...</p>
              </div>

              {/* Progress indicator */}
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mt-4">
                <div className="bg-emerald-500 h-full w-full animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

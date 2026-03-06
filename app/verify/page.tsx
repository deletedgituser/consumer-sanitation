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
      <header className="relative z-20 flex min-h-[44px] items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <Link href="/" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
          ← Back
        </Link>
        <h1 className="text-base font-semibold text-white sm:text-lg">ID Verification</h1>
        <div className="w-14" />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-2 sm:p-4">
        <div className="mb-3 w-full max-w-4xl rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-slate-200">
          <p>
            Account: <span className="font-semibold text-white">{accountNumber}</span>
          </p>
          {isLoadingAccount ? (
            <p className="mt-1 text-slate-300">Loading account owner information...</p>
          ) : accountLoadError ? (
            <p className="mt-1 text-red-300">{accountLoadError}</p>
          ) : (
            <p className="mt-1 text-slate-300">
              Expected owner name: <span className="font-semibold text-white">{accountOwnerName}</span>
            </p>
          )}
        </div>

        {status === "permission" && (
          <div className="flex max-w-md flex-col items-center gap-6 rounded-2xl border border-white/10 bg-slate-800/90 p-6 text-center backdrop-blur-sm sm:p-8">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white sm:text-xl">Camera access needed</h2>
              <p className="text-sm leading-relaxed text-slate-300">
                Allow camera access to scan your ID and verify the name against the account owner.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-colors hover:bg-blue-500 active:scale-[0.98]"
              disabled={isLoadingAccount || Boolean(accountLoadError)}
            >
              Allow camera
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-slate-300">Opening camera...</p>
          </div>
        )}

        {status === "denied" && (
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/80 p-6 text-center backdrop-blur-sm">
            <p className="text-slate-200">Camera access was denied.</p>
            <button
              type="button"
              onClick={() => setStatus("permission")}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Try again
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/80 p-6 text-center backdrop-blur-sm">
            <p className="text-slate-200">Could not start camera.</p>
            <p className="text-sm text-slate-400">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setStatus("permission")}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Try again
            </button>
          </div>
        )}

        {(status === "ready" || status === "scanning") && (
          <div className="flex w-full max-w-4xl min-h-0 flex-1 flex-col gap-3 sm:gap-4">
            <div className="relative h-[75vh] max-h-[75vh] w-full flex-shrink-0 overflow-hidden rounded-xl bg-black sm:rounded-2xl">
              <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 sm:p-4">
                <div className="relative h-full w-full max-w-xs rounded-lg border-2 border-dashed border-white/50 sm:max-w-sm">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center text-white/90">
                    <span className="text-sm font-medium">Position your ID inside the frame</span>
                    <span className="text-xs text-white/70">Capture to verify name</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-4xl flex-shrink-0 gap-3 sm:gap-4">
              <label className="flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-slate-500 bg-slate-700 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-slate-600 active:scale-[0.98]">
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
                Upload ID
              </label>

              <button
                type="button"
                onClick={captureAndVerify}
                disabled={isVerifying || isLoadingAccount || Boolean(accountLoadError)}
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl border border-blue-500 bg-blue-600 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? "Verifying..." : "Capture & Verify"}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(`/verify-customer?account=${encodeURIComponent(accountNumber)}&verified=1`)
                }
                disabled={!canContinue}
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>

            {verificationMessage && (
              <p className={`text-center text-sm ${isVerified ? "text-emerald-300" : "text-amber-300"}`}>
                {verificationMessage}
              </p>
            )}

            {ocrPreviewText && (
              <p className="rounded-lg border border-white/10 bg-slate-800/80 p-3 text-xs text-slate-300">
                OCR preview: {ocrPreviewText.slice(0, 220)}{ocrPreviewText.length > 220 ? "..." : ""}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

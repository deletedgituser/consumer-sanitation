"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { extractOwnerName, isNameMatchFromOcr } from "@/lib/account-verification";
import { signOut } from "next-auth/react";

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

  useEffect(() => {
    if (isVerified) {
      const timeout = setTimeout(() => {
        router.push(`/verify-customer/landing?account=${encodeURIComponent(accountNumber)}&verified=1`);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [isVerified, accountNumber, router]);

  if (!accountNumber) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f4f0] p-6 text-center text-neutral-600">
        <p>No account number provided. <Link href="/" className="text-neutral-900 underline">Return home</Link> and enter an account number first.</p>
      </div>
    );
  }

  const canContinue = isVerified && !isLoadingAccount && !accountLoadError;

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col bg-[#f5f4f0]">
      <header className="flex min-h-[56px] items-center justify-between border-b border-neutral-200/80 bg-[#faf9f6]/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        {!isVerified ? (
          <Link href="/" className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900">
            ← Back
          </Link>
        ) : (
          <div className="w-12" />
        )}
        <h1 className="text-base font-medium tracking-tight text-neutral-900 sm:text-lg" style={{ letterSpacing: "-0.02em" }}>
          ID Verification
        </h1>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
        >
          Logout
        </button>
      </header>

      <main className="relative flex min-h-0 flex-1 w-full flex-col items-center overflow-y-auto p-4 sm:p-6 lg:justify-center">
        {/* Account info – minimal card */}
        <div className="mb-6 w-full max-w-2xl rounded-2xl border border-neutral-200/80 bg-[#faf9f6] px-4 py-3 shadow-sm sm:px-5 sm:py-4">
          <p className="text-sm text-neutral-600">
            Account <span className="font-medium text-neutral-900">{accountNumber}</span>
          </p>
          {isLoadingAccount ? (
            <p className="mt-1.5 text-sm text-neutral-500">Loading owner…</p>
          ) : accountLoadError ? (
            <p className="mt-1.5 text-sm text-red-600">{accountLoadError}</p>
          ) : (
            <p className="mt-1.5 text-sm text-neutral-500">
              Owner <span className="font-medium text-neutral-900">{accountOwnerName}</span>
            </p>
          )}
        </div>

        {status === "permission" && (
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-6 text-center shadow-sm sm:rounded-3xl sm:p-8">
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-neutral-900" style={{ letterSpacing: "-0.02em" }}>Camera access</h2>
              <p className="text-sm leading-relaxed text-neutral-500">
                Allow camera access to scan your ID and verify the name against the account owner. Use portrait mode for best results.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.99] sm:min-h-[48px] sm:rounded-2xl disabled:opacity-50"
              disabled={isLoadingAccount || Boolean(accountLoadError)}
            >
              Allow camera
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            <p className="text-sm text-neutral-500">Opening camera…</p>
          </div>
        )}

        {status === "denied" && (
          <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-6 text-center shadow-sm sm:p-8">
            <p className="text-lg font-medium text-neutral-900">Camera denied</p>
            <p className="text-sm text-neutral-500">Enable camera permissions in your device settings to continue.</p>
            <button
              type="button"
              onClick={() => setStatus("permission")}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 sm:rounded-2xl"
            >
              Try again
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-6 text-center shadow-sm sm:p-8">
            <p className="text-lg font-medium text-neutral-900">Camera error</p>
            <p className="text-sm text-neutral-500">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setStatus("permission")}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 sm:rounded-2xl"
            >
              Try again
            </button>
          </div>
        )}

        {(status === "ready" || status === "scanning") && (
          <div className="flex w-full max-w-2xl min-h-0 flex-1 flex-col gap-4">
            <div className="relative aspect-[4/3] w-full max-h-[60vh] flex-shrink-0 overflow-hidden rounded-2xl bg-neutral-200/60 sm:rounded-3xl">
              <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <div className="relative w-full max-w-sm rounded-xl border-2 border-neutral-300/90 bg-black/20" style={{ aspectRatio: "1.6 / 1" }}>
                  <div className="absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2 border-neutral-400" />
                  <div className="absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2 border-neutral-400" />
                  <div className="absolute bottom-2 left-2 h-6 w-6 border-l-2 border-b-2 border-neutral-400" />
                  <div className="absolute bottom-2 right-2 h-6 w-6 border-r-2 border-b-2 border-neutral-400" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm font-medium text-white drop-shadow-md">Position ID here</p>
                    <p className="text-xs text-white/80 drop-shadow">Keep name visible</p>
                  </div>
                </div>
                <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/90 drop-shadow">Portrait mode, good lighting</p>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
              <label className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm transition-all hover:bg-neutral-50 active:scale-[0.99] sm:rounded-2xl disabled:pointer-events-none disabled:opacity-50">
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
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-50 sm:rounded-2xl"
              >
                {isVerifying ? "Verifying…" : "Capture & verify"}
              </button>
              {!isVerified ? (
                <button
                  type="button"
                  onClick={() => router.push(`/verify-customer/landing?account=${encodeURIComponent(accountNumber)}&verified=1`)}
                  disabled={!canContinue}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 disabled:opacity-40 sm:rounded-2xl"
                >
                  Continue →
                </button>
              ) : (
                <div className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white sm:rounded-2xl">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span className="ml-2">Redirecting…</span>
                </div>
              )}
            </div>

            {verificationMessage && (
              <p className={`text-center text-sm font-medium ${isVerified ? "text-green-700" : "text-amber-700"}`}>
                {verificationMessage}
              </p>
            )}

            {ocrPreviewText && (
              <details className="rounded-xl border border-neutral-200/80 bg-[#faf9f6] p-3 text-sm text-neutral-600">
                <summary className="cursor-pointer font-medium text-neutral-700">OCR preview</summary>
                <p className="mt-2 break-words">{ocrPreviewText.slice(0, 280)}{ocrPreviewText.length > 280 ? "…" : ""}</p>
              </details>
            )}
          </div>
        )}

        {isVerifying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-8 shadow-lg sm:rounded-3xl">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
              <div className="text-center">
                <p className="font-medium text-neutral-900">Processing ID</p>
                <p className="mt-1 text-sm text-neutral-500">Analyzing your ID…</p>
              </div>
            </div>
          </div>
        )}

        {isVerified && !isVerifying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <style>{`
              @keyframes verify-scale-in {
                0% { transform: scale(0.95); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
              }
              .verify-success { animation: verify-scale-in 0.25s ease-out; }
            `}</style>
            <div className="verify-success flex flex-col items-center gap-5 rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-8 shadow-lg sm:rounded-3xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium text-neutral-900">Verification complete</p>
                <p className="mt-1 text-sm text-green-700">ID name matches account owner</p>
                <p className="mt-2 text-xs text-neutral-500">Redirecting…</p>
              </div>
              <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-full animate-pulse rounded-full bg-green-500" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

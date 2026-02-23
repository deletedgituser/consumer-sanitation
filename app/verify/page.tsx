"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export default function VerifyPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<
    "permission" | "loading" | "ready" | "scanning" | "error" | "denied"
  >("permission");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const startCamera = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        "Camera is only available in a secure context. Please open this site over HTTPS (or from localhost on your computer). On your phone, use a tunnel like ngrok or deploy the app so the URL starts with https://."
      );
      setStatus("error");
      return;
    }

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not access camera";
      setErrorMessage(message);
      setStatus(err instanceof Error && message.toLowerCase().includes("denied") ? "denied" : "error");
    }
  }, []);

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
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col bg-slate-900">
      <header className="relative z-20 flex min-h-[44px] items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <Link
          href="/"
          className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          ← Back
        </Link>
        <h1 className="text-base font-semibold text-white sm:text-lg">ID Verification</h1>
        <div className="w-14" />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-2 sm:p-4">
        {/* Step 1: Explicit permission – tap to trigger browser permission */}
        {status === "permission" && (
          <div className="flex max-w-md flex-col items-center gap-6 rounded-2xl border border-white/10 bg-slate-800/90 p-6 text-center backdrop-blur-sm sm:p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
              <svg
                className="h-8 w-8 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 13v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Camera access needed
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                To scan your ID, this page needs to use your phone’s camera. Tap the button
                below – your phone will then ask to allow camera access. Choose{" "}
                <strong className="text-white">Allow</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-colors hover:bg-blue-500 active:scale-[0.98]"
            >
              Allow camera
            </button>
            <p className="text-xs text-slate-500">
              We only use the camera to scan your ID. No recording is saved.
            </p>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-slate-300">Opening camera...</p>
            <p className="text-sm text-slate-400">
              If a permission popup appears, tap <strong className="text-white">Allow</strong>.
            </p>
          </div>
        )}

        {status === "denied" && (
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-800/80 p-6 text-center backdrop-blur-sm">
            <p className="text-slate-200">Camera access was denied.</p>
            <p className="text-sm text-slate-400">
              To scan your ID, enable the camera for this site in your browser or phone
              settings, then try again.
            </p>
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
          <>
            <div className="flex w-full max-w-4xl flex-1 min-h-0 flex-col gap-3 sm:gap-4">
              {/* Camera: 3/4 of viewport height */}
              <div className="relative h-[75vh] max-h-[75vh] w-full flex-shrink-0 overflow-hidden rounded-xl bg-black sm:rounded-2xl">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 sm:p-4">
                  <div className="relative h-full w-full max-w-xs rounded-lg border-2 border-dashed border-white/50 sm:max-w-sm">
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center text-white/90">
                      <span className="text-sm font-medium">Position your ID inside the frame</span>
                      <span className="text-xs text-white/70">Scanning automatically...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button row: Upload (left) + Next (right) - uniform style */}
              <div className="flex w-full max-w-4xl flex-shrink-0 gap-3 sm:gap-4">
                <label className="flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-slate-500 bg-slate-700 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-slate-600 active:scale-[0.98]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("Uploaded:", file.name);
                        e.target.value = "";
                      }
                    }}
                  />
                  <svg
                    className="h-5 w-5 shrink-0 text-white/90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Upload
                </label>
                <Link
                  href="/verify-customer"
                  className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-blue-600 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[rgba(245,158,11,0.25)] active:scale-[0.98]"
                >
                  Next
                </Link>
              </div>
              <p className="text-center text-sm text-slate-400">
                {/* {status === "ready" ? "Starting camera..." : "Scanning ID..."} */}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

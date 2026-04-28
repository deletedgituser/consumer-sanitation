"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

type TicketCategory = "ID_MISSPELLED" | "NO_ID" | "ID_IN_4PS" | "OTHER";

const CATEGORY_OPTIONS: { value: TicketCategory; label: string; help: string }[] = [
  {
    value: "ID_MISSPELLED",
    label: "ID Misspelled",
    help: "The name on my ID is spelled differently than my account.",
  },
  {
    value: "NO_ID",
    label: "No ID",
    help: "I do not have a valid government ID to upload.",
  },
  {
    value: "ID_IN_4PS",
    label: "ID is written in 4Ps",
    help: "My ID / name is registered under the 4Ps program.",
  },
  { value: "OTHER", label: "Other concern", help: "Describe your concern below." },
];

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];

export default function RequestTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountNumber = searchParams.get("account")?.trim() ?? "";

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<TicketCategory>("ID_MISSPELLED");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);

  // OTP modal state (demo-mode, client-side only — mirrors /verify-customer flow)
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const phoneError = useMemo(() => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      return "Phone number should be 10–13 digits.";
    }
    return "";
  }, [phone]);

  const messageLen = message.trim().length;
  const MESSAGE_MIN = 10;
  const messageError =
    messageLen === 0
      ? ""
      : messageLen < MESSAGE_MIN
        ? `Notes must be at least ${MESSAGE_MIN} characters.`
        : "";

  const canSubmit =
    !submitting &&
    name.trim().length > 1 &&
    address.trim().length > 1 &&
    phone.trim().length > 0 &&
    !phoneError &&
    messageLen >= MESSAGE_MIN &&
    !!file;

  const onPickFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    if (!ACCEPTED_MIME.includes(f.type)) {
      toast.error("Please upload an image (PNG / JPG / WEBP) or PDF.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error("Attachment must be 8 MB or smaller.");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  // Generate 6-digit OTP, open modal, start 30s resend cooldown.
  const sendDemoOtp = useCallback(() => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpCode(code);
    setOtpInput("");
    setOtpError("");
    setOtpCooldown(30);
    return code;
  }, []);

  // Countdown for resend cooldown.
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  const openOtpModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    sendDemoOtp();
    setOtpOpen(true);
  };

  const resendOtp = () => {
    if (otpCooldown > 0) return;
    sendDemoOtp();
    toast.success("A new code was sent.");
  };

  const submitTicket = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("address", address.trim());
      fd.append("location", location.trim());
      fd.append("phoneNumber", phone.trim());
      fd.append("category", category);
      if (accountNumber) fd.append("accountNumber", accountNumber);
      fd.append("message", message.trim());
      if (file) fd.append("attachment", file);

      const res = await fetch("/api/tickets", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit your ticket.");
      }
      toast.success("Ticket submitted. We'll review it shortly.");
      setOtpOpen(false);
      setSubmitted({ id: data.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAndSubmit = async () => {
    if (otpInput.trim().length !== 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }
    if (otpInput.trim() !== otpCode) {
      setOtpError("Incorrect code. Please try again.");
      return;
    }
    setOtpError("");
    setOtpVerifying(true);
    // Small optimistic delay so the UI feels like a real verification step.
    await new Promise((r) => setTimeout(r, 350));
    setOtpVerifying(false);
    await submitTicket();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f2ea] py-10 px-4">
        <div className="mx-auto max-w-xl rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-7 w-7 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Ticket submitted</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Your request has been received. An administrator will review your concern and contact you
              using the phone number you provided.
            </p>
            <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              <div>
                <span className="text-neutral-500">Reference&nbsp;ID:&nbsp;</span>
                <span className="font-mono font-medium text-neutral-900">{submitted.id}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Return home
              </Link>
              <button
                type="button"
                onClick={() => router.push(`/verify?account=${encodeURIComponent(accountNumber)}`)}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Back to verification
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ea] py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={accountNumber ? `/verify?account=${encodeURIComponent(accountNumber)}` : "/"}
            className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          {accountNumber && (
            <span className="rounded-full bg-neutral-900/5 px-3 py-1 text-xs font-medium text-neutral-700">
              Account: <span className="font-mono">{accountNumber}</span>
            </span>
          )}
        </div>

        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Request a support ticket</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Can&apos;t verify your ID? Tell us what&apos;s going on and attach a photo of your ID or any
            supporting proof. Our admin team will review your request.
          </p>

          <form onSubmit={openOtpModal} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="ts-input"
                  required
                />
              </Field>
              <Field label="Phone number" required error={phoneError}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 09171234567"
                  inputMode="tel"
                  className="ts-input"
                  required
                />
              </Field>
            </div>

            <Field label="Home address" required>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, Barangay, Municipality"
                className="ts-input"
                required
              />
            </Field>

            <Field label="Location / Landmark">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Nearest landmark or sitio (optional)"
                className="ts-input"
              />
            </Field>

            <Field label="Ticket option" required>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="ts-input bg-white"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">
                {CATEGORY_OPTIONS.find((c) => c.value === category)?.help}
              </p>
            </Field>

            <Field label="Additional notes" required error={messageError}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Briefly describe your concern (at least ${MESSAGE_MIN} characters)`}
                rows={4}
                required
                className="ts-input resize-none"
              />
              <div className="mt-1 flex justify-between text-xs text-neutral-500">
                <span className={messageLen > 0 && messageLen < MESSAGE_MIN ? "text-amber-700" : ""}>
                  Minimum {MESSAGE_MIN} characters
                </span>
                <span className={messageLen > 0 && messageLen < MESSAGE_MIN ? "text-red-600" : ""}>
                  {messageLen}
                </span>
              </div>
            </Field>

            <Field label="Upload ID or proof" required>
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed ${
                  file ? "border-neutral-300" : "border-red-300"
                } bg-neutral-50 px-4 py-6 text-center transition hover:border-neutral-400`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onPickFile(e.dataTransfer.files?.[0] ?? null);
                }}
              >
                {filePreview ? (
                  <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-48 rounded-lg border border-neutral-200 object-contain"
                    />
                    <p className="text-xs text-neutral-600">{file?.name}</p>
                  </div>
                ) : file ? (
                  <p className="text-sm text-neutral-700">{file.name}</p>
                ) : (
                  <>
                    <svg className="mb-2 h-8 w-8 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-6-6l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-neutral-700">Click to upload or drag a file</p>
                    <p className="mt-1 text-xs text-neutral-500">PNG, JPG, WEBP or PDF · up to 8 MB</p>
                  </>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800"
                  >
                    {file ? "Replace" : "Choose file"}
                  </button>
                  {file && (
                    <button
                      type="button"
                      onClick={() => onPickFile(null)}
                      className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_MIME.join(",")}
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {!file && (
                <p className="mt-1 text-xs text-red-600">
                  A photo of your ID or supporting proof is required.
                </p>
              )}
            </Field>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmit}
              >
                Verify phone & submit
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* OTP verification modal */}
      {otpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Verify your phone number
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-neutral-900">{phone}</span>.
                  Enter it below to submit your ticket.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (submitting || otpVerifying) return;
                  setOtpOpen(false);
                }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                aria-label="Close"
                disabled={submitting || otpVerifying}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Demo banner — remove when wiring to a real SMS gateway */}
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-semibold">Demo mode:</span> your code is{" "}
              <span className="font-mono font-bold tracking-widest">{otpCode}</span>
            </div>

            <label className="mt-4 block text-sm font-medium text-neutral-800">
              Enter verification code
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpInput}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpInput(v);
                  if (otpError) setOtpError("");
                }}
                placeholder="••••••"
                autoFocus
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-center text-lg font-mono tracking-[0.5em] text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
            </label>
            {otpError && (
              <p className="mt-2 text-xs font-medium text-red-600">{otpError}</p>
            )}

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-neutral-500">Didn&apos;t get the code?</span>
              <button
                type="button"
                onClick={resendOtp}
                disabled={otpCooldown > 0 || submitting || otpVerifying}
                className="font-medium text-neutral-900 hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
              >
                {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend code"}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (submitting || otpVerifying) return;
                  setOtpOpen(false);
                }}
                disabled={submitting || otpVerifying}
                className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyAndSubmit}
                disabled={otpInput.length !== 6 || otpVerifying || submitting}
                className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {otpVerifying
                  ? "Verifying…"
                  : submitting
                  ? "Submitting…"
                  : "Verify & submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.ts-input) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e5e5e5;
          background: #faf9f6;
          padding: 0.625rem 0.875rem;
          font-size: 0.9rem;
          color: #171717;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.ts-input:focus) {
          border-color: #171717;
          box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.08);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 inline-block text-sm font-medium text-neutral-800">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

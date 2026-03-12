"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [account, setAccount] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    if (!account) {
      toast.error("Please enter an account number.");
      return;
    }

    try {
      const trimmed = account.trim();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`/api/v1/accounts/${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const msg = await res.text();
        toast.error(`Account not found: ${msg || res.statusText}`);
        return;
      }

      const data = await res.json();
      toast.success("Account found! Proceeding to verification...");
      router.push(`/verify?account=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg === "The operation was aborted.") {
        toast.error("Request timed out. Please check your connection.");
      } else {
        toast.error(`Error: ${errorMsg}`);
      }
    }
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-x-hidden overflow-y-auto bg-[#EAEFEF] p-4 sm:p-6 [padding:max(1rem,env(safe-area-inset-top))_max(1rem,env(safe-area-inset-right))_max(1rem,env(safe-area-inset-bottom))_max(1rem,env(safe-area-inset-left))]">
      <div className="w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] md:grid-cols-[1.4fr_1fr]">
          {/* Left: form */}
          <div className="p-6 sm:p-10">

            <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Account Verification
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your account number to continue to ID verification.
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleVerify}>
              <div>
                <label htmlFor="account" className="text-xs font-semibold text-slate-700">
                  Account number
                </label>
                <div className="mt-2 flex min-h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors focus-within:border-[#3D45AA] focus-within:ring-2 focus-within:ring-[#3D45AA]/20">
                  <UserIcon className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    id="account"
                    type="text"
                    placeholder="Enter account number"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full min-w-0 border-0 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 [font-size:16px]"
                    autoComplete="off"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#F59E0B] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_30px_rgba(245,158,11,0.28)] transition-colors duration-200 hover:bg-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/35 focus:ring-offset-2 active:scale-[0.99]"
              >
                Verify
              </button>
            </form>
          </div>

          {/* Right: welcome panel */}
          <div className="relative overflow-hidden bg-[#3D45AA] p-8 sm:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#FFF19B]/30 blur-2xl" aria-hidden />

            <div className="relative flex h-full flex-col items-center justify-center text-center">
              <div className="mb-6 flex items-center justify-center">
                <Image
                  src="/logo_aneco.png"
                  alt="ANECO - Agusan Del Norte Electric Cooperative"
                  width={320}
                  height={320}
                  className="h-auto w-[240px] object-contain drop-shadow-[0_18px_45px_rgba(0,0,0,0.30)] sm:w-[280px]"
                  priority
                />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Welcome
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">
                Enter your account number to verify your identity and access your membership application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

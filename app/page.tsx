"use client";

import Image from "next/image";
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

    // verify existence by fetching from NextAuth API before navigation
    try {
      const trimmed = account.trim();
      console.log("[Account Lookup] Starting fetch for:", trimmed);
      
      // always hit local endpoint; proxy rule handles /api/v1 in dev
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await fetch(`/api/v1/accounts/${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      console.log("[Account Lookup] Response status:", res.status);
      
      if (!res.ok) {
        const msg = await res.text();
        console.error("[Account Lookup] Error response:", msg);
        toast.error(`Account not found: ${msg || res.statusText}`);
        return;
      }
      
      const data = await res.json();
      console.log("[Account Lookup] Success:", data.account_number);
      
      // success, navigate
      toast.success(`Account found! Proceeding to verification...`);
      router.push(`/verify?account=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Account Lookup] Exception:", errorMsg, err);
      
      if (errorMsg === "The operation was aborted.") {
        toast.error("Request timed out. Please check your connection.");
      } else {
        toast.error(`Error: ${errorMsg}`);
      }
    }
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[#f5f4f0] p-3 sm:p-5 md:p-6 lg:p-8 [padding:max(0.75rem,env(safe-area-inset-top))_max(0.75rem,env(safe-area-inset-right))_max(0.75rem,env(safe-area-inset-bottom))_max(0.75rem,env(safe-area-inset-left))]">
      <div className="relative z-10 flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
        <div className="login-card relative flex w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl sm:max-w-none sm:rounded-3xl sm:flex-row">
          {/* Left panel – logo */}
          <div className="flex min-h-[100px] w-full shrink-0 items-center justify-center p-4 sm:min-h-[140px] sm:p-6 md:w-[38%] md:min-h-[260px] lg:p-8 login-card-left">
            <div className="relative flex h-full w-full max-w-[140px] items-center justify-center sm:max-w-[180px] md:max-w-[200px]">
              <Image
                src="/logo_aneco.png"
                alt="ANECO - Agusan Del Norte Electric Cooperative"
                width={200}
                height={200}
                className="h-auto w-full object-contain"
                sizes="(max-width: 380px) 120px, (max-width: 480px) 140px, (max-width: 768px) 180px, 200px"
                priority
              />
            </div>
          </div>

          {/* Right panel – form */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-10 lg:py-12 login-card-right">
            <div className="w-full max-w-xs sm:max-w-[320px]">
              <h1 className="text-lg font-medium tracking-tight text-neutral-900 text-center sm:text-xl sm:text-left md:text-2xl" style={{ letterSpacing: "-0.02em" }}>
                Account Verification
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 text-center sm:mt-2 sm:text-left">
                Enter your account number to continue.
              </p>

              <form className="mt-4 space-y-4 sm:mt-6 sm:space-y-5" onSubmit={handleVerify}>
                <div>
                  <label htmlFor="account" className="sr-only">
                    Account number
                  </label>
                  <div className="flex min-h-[44px] items-center gap-3 rounded-xl border border-neutral-200/80 bg-white/90 px-3 py-2.5 transition-all duration-200 focus-within:border-neutral-300 focus-within:shadow-md focus-within:shadow-neutral-200/50 focus-within:ring-2 focus-within:ring-neutral-200/60 sm:min-h-[48px] sm:rounded-2xl sm:px-4">
                    <UserIcon className="h-5 w-5 shrink-0 text-neutral-400" />
                    <input
                      id="account"
                      type="text"
                      placeholder="Account number"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      className="w-full min-w-0 border-0 bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 [font-size:16px]"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-base font-medium text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 hover:shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 sm:min-h-[48px] sm:rounded-2xl"
                >
                  Verify
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

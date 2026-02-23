"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

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

function LockIcon({ className }: { className?: string }) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    router.push("/verify");
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-900 p-3 py-5 sm:p-5 sm:py-6 md:flex-row md:p-6 lg:p-8 [padding:max(0.75rem,env(safe-area-inset-top))_max(0.75rem,env(safe-area-inset-right))_max(0.75rem,env(safe-area-inset-bottom))_max(0.75rem,env(safe-area-inset-left))]">
      {/* Realistic lightning – video loop */}
      <div className="lightning-video-wrap pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <video
          className="h-full w-full object-cover object-center opacity-[0.5]"
          src="https://assets.mixkit.co/videos/47948/47948-720.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      </div>
      {/* Card wrapper – centered on mobile, glass style */}
      <div className="relative z-10 flex w-full max-w-4xl flex-1 flex-col items-center justify-center">
        <div className="login-card relative flex w-full max-w-4xl flex-col overflow-hidden rounded-xl shadow-xl sm:rounded-2xl md:flex-row">
          {/* Left panel – logo */}
          <div className="flex min-h-[140px] w-full shrink-0 items-center justify-center p-4 sm:min-h-[180px] sm:p-6 md:min-h-0 md:w-[42%] md:min-w-0 md:shrink lg:w-[45%] lg:min-w-[260px] lg:p-8 login-card-left">
            <div className="relative flex h-full w-full max-w-[200px] items-center justify-center sm:max-w-[260px] md:max-w-none md:min-h-[280px]">
              <Image
                src="/logo_aneco.png"
                alt="ANECO - Agusan Del Norte Electric Cooperative"
                width={280}
                height={280}
                className="h-auto w-full object-contain"
                sizes="(max-width: 480px) 180px, (max-width: 640px) 220px, (max-width: 768px) 260px, 280px"
                priority
              />
            </div>
          </div>

          {/* Right panel – form */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-10 lg:py-12 login-card-right">
            <div className="w-full max-w-sm">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                Welcome Back!
              </h1>
              <p className="mt-1.5 text-sm text-slate-300 sm:mt-2">
                Please enter your details.
              </p>

              <form className="mt-5 space-y-4 sm:mt-6 sm:space-y-5 lg:mt-8" onSubmit={handleVerify}>
                <div>
                  <label htmlFor="email" className="sr-only">
                    Account number
                  </label>
                  <div className="flex min-h-[44px] items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm transition-colors focus-within:border-blue-400/60 focus-within:ring-2 focus-within:ring-blue-400/30">
                    <UserIcon className="h-5 w-5 shrink-0 text-slate-400" />
                    <input
                      id="email"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter your Account Number"
                      className="w-full min-w-0 border-0 bg-transparent text-base text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 [font-size:16px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[rgba(245,158,11,0.25)] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900/50 active:scale-[0.98]"
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

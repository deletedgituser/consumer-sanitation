"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

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

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin");
    }
  }, [status, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
        setPassword("");
      } else if (result?.ok) {
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-x-hidden overflow-y-auto bg-[#EAEFEF] p-4 sm:p-6 [padding:max(1rem,env(safe-area-inset-top))_max(1rem,env(safe-area-inset-right))_max(1rem,env(safe-area-inset-bottom))_max(1rem,env(safe-area-inset-left))]">
      <div className="w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] md:grid-cols-2">
          {/* Left: form */}
          <div className="p-6 sm:p-10">
            <div className="flex items-center justify-between gap-4">
              
            </div>

            <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Use your admin username and password.
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleLogin}>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="text-xs font-semibold text-slate-700">
                  Username
                </label>
                <div className="mt-2 flex min-h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors focus-within:border-[#3D45AA] focus-within:ring-2 focus-within:ring-[#3D45AA]/20">
                  <UserIcon className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full min-w-0 border-0 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 [font-size:16px]"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </label>
                <div className="mt-2 flex min-h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors focus-within:border-[#3D45AA] focus-within:ring-2 focus-within:ring-[#3D45AA]/20">
                  <LockIcon className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-w-0 border-0 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 [font-size:16px]"
                    autoComplete="current-password"
                  />
                </div>
              </div>

          
               

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#F59E0B] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_30px_rgba(245,158,11,0.28)] transition-colors duration-200 hover:bg-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/35 focus:ring-offset-2 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
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
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">
                Manage membership applications, review submissions, and approve records in one place.
              </p>

              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

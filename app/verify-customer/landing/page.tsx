 "use client";
 
 import Image from "next/image";
 import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
 import { useRouter, useSearchParams } from "next/navigation";
 import toast from "react-hot-toast";
 import { extractOwnerName } from "@/lib/account-verification";
 import { signOut } from "next-auth/react";
 
 export default function VerifyCustomerLandingPage() {
   const router = useRouter();
   const search = useSearchParams();
   const account = search.get("account") ?? "";
   const verified = search.get("verified") ?? "";
 
   const canContinue = useMemo(() => Boolean(account) && verified === "1", [account, verified]);
 
  type Scope = "name";
  type ApplicationReason = "simple_correction" | "change_owner_purchase" | "change_owner_inheritance";

  const [reason, setReason] = useState<ApplicationReason>("simple_correction");
  const [scope, setScope] = useState<Scope>("name");
  const [ownerName, setOwnerName] = useState("");

  const [notifications, setNotifications] = useState<{ id: string; message: string; type: string; createdAt?: string }[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const formatNotificationTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  useEffect(() => {
    if (!notificationOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setNotificationOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [notificationOpen]);

  useEffect(() => {
    if (!account || verified !== "1") return;
    fetch(`/api/applications/${encodeURIComponent(account)}/notifications`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: { id: string; message: string; type: string; createdAt?: string }[]) => setNotifications(list))
      .catch(() => {});
  }, [account, verified]);

  useEffect(() => {
    if (!account || verified !== "1") return;
    fetch(`/api/v1/accounts/${encodeURIComponent(account)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const name = extractOwnerName(data);
        if (name) setOwnerName(name);
      })
      .catch(() => {});
  }, [account, verified]);

  const clearAllNotifications = async () => {
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(account)}/notifications`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setNotifications([]);
      setNotificationOpen(false);
      toast.success("Notification history cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const continueNext = () => {
    if (!canContinue) return;
    router.push(
      `/verify-customer?account=${encodeURIComponent(account)}&verified=1&mode=edit&scope=${scope}&reason=${reason}`,
    );
  };
 
   if (!account) {
     return (
       <div className="flex min-h-screen items-center justify-center bg-[#f5f4f0] p-6 text-center text-neutral-600">
         <p>
           No account number provided. <Link href="/" className="text-neutral-900 underline">Return home</Link> and enter an account number first.
         </p>
       </div>
     );
   }
 
   if (verified !== "1") {
     return (
       <div className="flex min-h-screen items-center justify-center bg-[#f5f4f0] p-6 text-center text-neutral-600">
         <p>
           Identity verification is required.{" "}
           <Link href={`/verify?account=${encodeURIComponent(account)}`} className="text-neutral-900 underline">
             Go to verification
           </Link>
           .
         </p>
       </div>
     );
   }
 
   return (
     <div className="relative flex min-h-screen min-h-[100dvh] flex-col bg-[#f5f4f0]">
       <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-[#faf9f6]/80 backdrop-blur-md">
         <div className="mx-auto flex min-h-[60px] w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="w-12" />
          <div className="flex items-center justify-center">
            <Image src="/logo_aneco.png" alt="ANECO" width={28} height={28} className="object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setNotificationOpen((o) => !o)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-medium text-white">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200/80 bg-[#faf9f6] shadow-lg">
                  <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 px-4 py-3">
                    <h3 className="text-sm font-semibold text-neutral-900">Notifications</h3>
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
                      disabled={notifications.length === 0}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-2">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-neutral-500">No notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 bg-neutral-50/50">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200">
                            <svg className="h-4 w-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-neutral-900">{n.message}</p>
                            {n.createdAt && (
                              <p className="mt-0.5 text-xs text-neutral-500">{formatNotificationTime(n.createdAt)}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-neutral-200/80 bg-white px-3 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
            >
              Logout
            </button>
          </div>
         </div>
       </header>
 
       <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
         <div className="w-full max-w-3xl rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-5 shadow-sm sm:p-7">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-neutral-500">WELCOME</p>
            <h1 className="mt-2 text-xl font-medium tracking-tight text-neutral-900 sm:text-2xl" style={{ letterSpacing: "-0.02em" }}>
              {ownerName ? ownerName : "Customer"}
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Account <span className="font-semibold text-neutral-900">{account}</span>
            </p>
          </div>
 
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Application Type</p>
            <div className="space-y-2">
              {([
                {
                  id: "simple_correction",
                  label: "Correct my information (same owner)",
                  description: "Small fixes like typos or missing middle name.",
                  scope: "name",
                },
                {
                  id: "change_owner_purchase",
                  label: "Change owner – I bought this house / moved in",
                  description: "Transfer service to a new owner or occupant.",
                  scope: "name",
                },
                {
                  id: "change_owner_inheritance",
                  label: "Change owner – inheritance / legal transfer",
                  description: "Ownership changed due to inheritance or legal decision.",
                  scope: "name",
                },
              ] as { id: ApplicationReason; label: string; description: string; scope: Scope }[]).map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition-all hover:bg-neutral-50">
                  <input
                    type="radio"
                    name="applicationType"
                    value={opt.id}
                    checked={reason === opt.id}
                    onChange={() => {
                      setReason(opt.id);
                      setScope(opt.scope);
                    }}
                    className="h-4 w-4 cursor-pointer"
                  />
                  <span className="flex flex-col">
                    <span>{opt.label}</span>
                    <span className="mt-0.5 text-xs font-normal text-neutral-500">{opt.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-7 flex justify-end">
             <button
               type="button"
               onClick={continueNext}
               disabled={!canContinue}
               className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-50"
             >
               Continue
             </button>
           </div>
         </div>
       </main>
     </div>
   );
 }


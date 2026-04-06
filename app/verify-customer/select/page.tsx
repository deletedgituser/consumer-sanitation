 "use client";
 
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
 
 type Scope = "name" | "address" | "contact" | "custom";
 
export default function VerifyCustomerSelectPage() {
  const router = useRouter();
   const search = useSearchParams();
   const account = search.get("account") ?? "";
   const verified = search.get("verified") ?? "";
  const [scope, setScope] = useState<Scope>("name");
  const [customFields, setCustomFields] = useState<Record<string, boolean>>({
    firstName: true,
    middleName: true,
    lastName: true,
    suffixName: true,
    area: false,
    district: false,
    barangay: false,
    residenceAddress: false,
    cellphone: false,
    landline: false,
    email: false,
  });
 
   const canContinue = useMemo(() => Boolean(account) && verified === "1", [account, verified]);
 
  const goNext = () => {
     if (!canContinue) return;
    if (scope === "custom") {
      const fields = Object.entries(customFields)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(",");
      router.push(`/verify-customer?account=${encodeURIComponent(account)}&verified=1&mode=edit&scope=custom&fields=${encodeURIComponent(fields)}`);
      return;
    }
    router.push(`/verify-customer?account=${encodeURIComponent(account)}&verified=1&mode=edit&scope=${scope}`);
   };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
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
           <div className="flex items-center gap-3">
             <Image src="/logo_aneco.png" alt="ANECO" width={24} height={24} className="object-contain" />
             <p className="text-xs font-semibold tracking-[0.18em] text-neutral-900 sm:text-sm">
               APPLICATION OPTIONS
             </p>
           </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
          >
            Logout
          </button>
         </div>
       </header>
 
       <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
         <div className="w-full max-w-3xl rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-5 shadow-sm sm:p-7">
           <div className="text-center">
             <h1 className="text-xl font-medium tracking-tight text-neutral-900 sm:text-2xl" style={{ letterSpacing: "-0.02em" }}>
               Application options
             </h1>
             <p className="mt-2 text-sm text-neutral-500">
               Account <span className="font-semibold text-neutral-900">{account}</span>
             </p>
           </div>
 
           <div className="mt-6">
             <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Edit scope</p>
             <div className="space-y-2">
               {([
                   { id: "name", label: "Edit name only" },
                   { id: "address", label: "Edit address only" },
                   { id: "contact", label: "Edit contact only" },
                   { id: "custom", label: "Other: choose specific fields" },
                 ] as { id: Scope; label: string }[]).map((opt) => (
                 <label key={opt.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition-all hover:bg-neutral-50">
                   <input
                     type="radio"
                     name="scope"
                     value={opt.id}
                     checked={scope === opt.id}
                     onChange={() => setScope(opt.id)}
                     className="h-4 w-4 cursor-pointer"
                   />
                   <span>{opt.label}</span>
                 </label>
               ))}
             </div>
           </div>

          {scope === "custom" && (
            <div className="mt-4 rounded-2xl border border-neutral-200/80 bg-white p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Select fields</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(customFields).map(([key, checked]) => (
                  <label key={key} className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-3.5 py-2.5 text-sm font-medium text-neutral-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setCustomFields((p) => ({ ...p, [key]: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span>{key}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                This will only unlock the selected fields for editing.
              </p>
            </div>
          )}
 
          <div className="mt-7 flex justify-end">
             <button
               type="button"
               onClick={goNext}
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


"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { mapApiToForm, mapFormToApi } from "@/lib/account-verification";

// initial structure with empty values; real data is fetched from the API
const initialForm = {
  appType: "",
  membership: "",
  area: "",
  district: "",
  barangay: "",
  firstName: "",
  middleName: "",
  lastName: "",
  suffixName: "",
  birthdate: "",
  gender: "",
  civilStatus: "",
  spouseFirst: "",
  spouseMiddle: "",
  spouseLast: "",
  spouseSuffix: "",
  spouseBirthdate: "",
  residenceAddress: "",
  cellphone: "",
  landline: "",
  email: "",
  cosignatory: "",
  witness: "",
  status: "",
  orNumber: "",
  dateIssued: "",
  notes: "",
  accountNumber: "",
  privacyConsent: false,
  privacyNewsletter: false,
  privacyEmail: false,
  privacySms: false,
  privacyPhone: false,
  privacySocial: false,
};

/** Normalize enum values to lowercase for consistent form handling */
function normalizeFormData(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data };
  const enumFields = ['appType', 'membership', 'gender', 'civilStatus', 'status'];

  enumFields.forEach(field => {
    if (typeof normalized[field] === 'string') {
      normalized[field] = (normalized[field] as string).toLowerCase().trim();
    }
  });

  return normalized;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoToMonDdYyyy(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const [, yyyy, mm, dd] = m;
  const monthIdx = Number(mm) - 1;
  const mon = MONTHS_SHORT[monthIdx] ?? "";
  if (!mon) return "";
  return `${mon}-${dd}-${yyyy}`;
}

function monDdYyyyToIso(mon: string): string {
  const m = mon.match(/^([A-Za-z]{3})-(\d{2})-(\d{4})$/);
  if (!m) return "";
  const [, monStrRaw, dd, yyyy] = m;
  const monStr = monStrRaw.slice(0, 1).toUpperCase() + monStrRaw.slice(1).toLowerCase();
  const monthIdx = MONTHS_SHORT.indexOf(monStr);
  if (monthIdx < 0) return "";
  const mm = String(monthIdx + 1).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateToMonDdYyyy(value: unknown): string {
  const str = String(value ?? "").trim();
  if (!str) return "";
  // Already Mon-DD-YYYY
  if (/^[A-Za-z]{3}-\d{2}-\d{4}$/.test(str)) {
    const normalized = str.slice(0, 1).toUpperCase() + str.slice(1, 3).toLowerCase() + str.slice(3);
    return monDdYyyyToIso(normalized) ? normalized : str;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return isoToMonDdYyyy(str) || str;
  // MM/DD/YYYY
  const slashed = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashed) return isoToMonDdYyyy(`${slashed[3]}-${slashed[1]}-${slashed[2]}`) || str;
  // MM-DD-YYYY
  const dashed = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dashed) return isoToMonDdYyyy(`${dashed[3]}-${dashed[1]}-${dashed[2]}`) || str;
  return str;
}

function normalizeDateFields(data: Record<string, any>) {
  const next: Record<string, any> = { ...data };
  if ("birthdate" in next) next.birthdate = normalizeDateToMonDdYyyy(next.birthdate);
  if ("spouseBirthdate" in next) next.spouseBirthdate = normalizeDateToMonDdYyyy(next.spouseBirthdate);
  return next;
}

export default function VerifyCustomerPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastChangeSummary, setLastChangeSummary] = useState<{ label: string; before: string; after: string }[]>([]);
  const [form, setForm] = useState(initialForm);
  const [initialFormData, setInitialFormData] = useState(initialForm);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applicationFromDb, setApplicationFromDb] = useState<Record<string, unknown> | null>(null);
  const [defaultFormFromApi, setDefaultFormFromApi] = useState<typeof initialForm>(initialForm);
  const fetchIdRef = useRef(0);
  const birthdatePickerRef = useRef<HTMLInputElement>(null);
  const spouseBirthdatePickerRef = useRef<HTMLInputElement>(null);
  const search = useSearchParams();
  const accountParam = search.get("account");
  const reasonParam = (search.get("reason") ?? "").toString();
  const accountForApi = accountParam || form.accountNumber;
  const modeParam = (search.get("mode") ?? "").toLowerCase();
  const scopeParam = (search.get("scope") ?? "").toLowerCase();
  const fieldsParam = (search.get("fields") ?? "").toString();
  const allowEditingFromFlow = modeParam === "edit";
  const effectiveScope = (scopeParam === "name" || scopeParam === "address" || scopeParam === "contact" || scopeParam === "all")
    ? scopeParam
    : "all";
  const customFieldsSet = useMemo(() => {
    const parts = fieldsParam.split(",").map((s) => s.trim()).filter(Boolean);
    return new Set(parts);
  }, [fieldsParam]);

  const updateReasonLabel = useMemo(() => {
    if (reasonParam === "simple_correction") return "Correct my information (same owner)";
    if (reasonParam === "change_owner_purchase") return "Change owner – I bought this house / moved in";
    if (reasonParam === "change_owner_inheritance") return "Change owner – inheritance / legal transfer";
    return "";
  }, [reasonParam]);

  useEffect(() => {
    // If user came from the selection page with mode=edit, start in edit mode.
    if (allowEditingFromFlow) setIsEditing(true);
    if (modeParam === "view") setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowEditingFromFlow, modeParam]);

  const digitsOnly = (value: string) => value.replace(/\D+/g, "");
  const formatMonDdYyyyFromInput = (value: string) => {
    const trimmed = value.trim();
    // If user pastes ISO, normalize to Mon-DD-YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return isoToMonDdYyyy(trimmed) || trimmed;
    // If user pastes MM/DD/YYYY or MM-DD-YYYY, normalize
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return normalizeDateToMonDdYyyy(trimmed);
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return normalizeDateToMonDdYyyy(trimmed);
    // Otherwise keep as typed (we validate on submit if changed)
    return trimmed;
  };

  const canEditField = (field: keyof typeof initialForm) => {
    if (!allowEditingFromFlow) return false;
    // Fields that are never editable in the customer flow
    if (field === "membership" || field === "area" || field === "status" || field === "orNumber" || field === "dateIssued") {
      return false;
    }
    if (scopeParam === "custom") return customFieldsSet.has(field as string);
    if (effectiveScope === "all") return true;
    if (effectiveScope === "name") return ["firstName", "middleName", "lastName", "suffixName"].includes(field as string);
    if (effectiveScope === "address") return ["area", "district", "barangay", "residenceAddress"].includes(field as string);
    if (effectiveScope === "contact") return ["cellphone", "landline", "email"].includes(field as string);
    return true;
  };

  const persistNotification = useCallback(
    async (message: string, type: "PENDING" | "APPROVED" | "DECLINED" | "INFO") => {
      if (!accountForApi) return;
      try {
        fetchIdRef.current++;
        await fetch(`/api/applications/${encodeURIComponent(accountForApi)}/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, type }),
        });
      } catch {
        // non-blocking
      }
    },
    [accountForApi]
  );
  const verifiedParam = search.get("verified") === "1";

  const formFieldsForCompare = [
    "area", "district", "barangay", "firstName", "middleName", "lastName", "suffixName",
    "birthdate", "gender", "civilStatus", "spouseFirst", "spouseMiddle", "spouseLast", "spouseSuffix", "spouseBirthdate",
    "residenceAddress", "cellphone", "landline", "email", "cosignatory", "witness", "status", "orNumber", "dateIssued", "notes",
  ] as const;
  const enumComparableFields = new Set<string>(["gender", "civilStatus", "status"]);
  const comparableValue = (key: string, value: unknown) => {
    const str = String(value ?? "");
    return enumComparableFields.has(key) ? str.trim().toUpperCase() : str.trim();
  };
  const hasFormChanges = formFieldsForCompare.some((key) => {
    const k = key as string;
    if (!canEditField(key as keyof typeof initialForm)) return false;
    return comparableValue(k, form[key]) !== comparableValue(k, initialFormData[key]);
  });

  const fieldLabels: Record<(typeof formFieldsForCompare)[number], string> = {
    area: "Area",
    district: "District",
    barangay: "Barangay",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    suffixName: "Suffix Name",
    birthdate: "Birthdate",
    gender: "Gender",
    civilStatus: "Civil Status",
    spouseFirst: "Spouse First Name",
    spouseMiddle: "Spouse Middle Name",
    spouseLast: "Spouse Last Name",
    spouseSuffix: "Spouse Suffix",
    spouseBirthdate: "Spouse Birthdate",
    residenceAddress: "Residence Address",
    cellphone: "Cellphone No.",
    landline: "Landline No.",
    email: "Email Address",
    cosignatory: "Co-signatory",
    witness: "Witness",
    status: "Status",
    orNumber: "OR Number",
    dateIssued: "Date Issued",
    notes: "Notes",
  };

  // No notifications or logout shown on edit page (per UX).

  function buildChangeSummary(): { label: string; before: string; after: string }[] {
    const changedFields: { label: string; before: string; after: string }[] = [];
    formFieldsForCompare.forEach((key) => {
      if (!canEditField(key as keyof typeof initialForm)) return;
      const k = key as string;
      const beforeVal = comparableValue(k, initialFormData[key]);
      const afterVal = comparableValue(k, form[key]);
      if (beforeVal !== afterVal) {
        changedFields.push({
          label: fieldLabels[key],
          before: beforeVal || "—",
          after: afterVal || "—",
        });
      }
    });
    return changedFields;
  }

  const openReviewChangesModal = () => {
    if (!hasFormChanges) {
      toast("No changes to save");
      return;
    }

    const didChange = (key: keyof typeof initialForm) => {
      const k = key as unknown as string;
      return comparableValue(k, form[key]) !== comparableValue(k, initialFormData[key]);
    };

    const email = String(form.email ?? "").trim();
    if (canEditField("email") && didChange("email") && email && !email.includes("@")) {
      toast.error("Please enter a valid email address (must include @).");
      return;
    }

    setLastChangeSummary(buildChangeSummary());
    setSubmitError(null);
    setShowConfirmation(true);
  };

  const handleSubmitApplication = async () => {
    if (!hasFormChanges) {
      setShowConfirmation(false);
      toast("No changes to save");
      return;
    }

    const didChange = (key: keyof typeof initialForm) => {
      const k = key as unknown as string;
      return comparableValue(k, form[key]) !== comparableValue(k, initialFormData[key]);
    };

    const email = String(form.email ?? "").trim();
    if (canEditField("email") && didChange("email") && email && !email.includes("@")) {
      toast.error("Please enter a valid email address (must include @).");
      return;
    }

    const originalName = [
      initialFormData.firstName,
      initialFormData.middleName,
      initialFormData.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const apiPayload = mapFormToApi(form);
      const accountNumberForPatch = accountParam || form.accountNumber;

      if (!accountNumberForPatch) {
        throw new Error("No account number available for update.");
      }

      const reasonKeys = new Set(["simple_correction", "change_owner_purchase", "change_owner_inheritance"]);
      const customerReason = reasonKeys.has(reasonParam) ? reasonParam : undefined;

      const response = await fetch(
        `/api/applications/${encodeURIComponent(accountNumberForPatch)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "edit",
            source: "customer",
            ...apiPayload,
            ...(customerReason !== undefined ? { customer_update_reason: customerReason } : {}),
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
      }

      const updated = await response.json();
      setApplicationFromDb(updated);
      const merged = {
        ...form,
        status: updated.status ?? form.status,
        orNumber: updated.orNumber ?? form.orNumber,
        dateIssued: updated.dateIssued ?? form.dateIssued,
        notes: updated.notes ?? form.notes,
      };
      setForm(merged);
      setInitialFormData(merged);

      setShowConfirmation(false);
      setShowSuccessModal(true);
      setIsEditing(false);

      const wantsText = updateReasonLabel
        ? `Wants to ${updateReasonLabel}`
        : "Application submitted";

      const notifMessage = `${originalName || "Customer"}\n${wantsText}`;

      persistNotification(notifMessage, "INFO");
      toast.success("Application submitted successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const errorMsg = message || "Failed to submit application. Please try again.";
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const stripSymbolsExceptHyphen = (value: string) =>
    value.replace(/[^a-zA-Z0-9\s-]+/g, "");

  const updateNoSymbols =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: stripSymbolsExceptHyphen(e.target.value) }));

  const updateDigits =
    (key: keyof typeof form, maxLen?: number) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => {
        const next = digitsOnly(e.target.value);
        return { ...prev, [key]: typeof maxLen === "number" ? next.slice(0, maxLen) : next };
      });

  const updateDateIso = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: formatMonDdYyyyFromInput(e.target.value) }));

  const updateEmail = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value.replace(/\s+/g, "") }));

  const toIsoForDateInput = (value: string) => {
    const str = String(value ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^[A-Za-z]{3}-\d{2}-\d{4}$/.test(str)) return monDdYyyyToIso(str) || "";
    // Try best-effort normalize for legacy formats
    const normalized = normalizeDateToMonDdYyyy(str);
    return /^[A-Za-z]{3}-\d{2}-\d{4}$/.test(normalized) ? (monDdYyyyToIso(normalized) || "") : "";
  };
  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const el = ref.current;
    if (!el) return;
    // Chromium supports showPicker(); fallback to click/focus.
    (el as any).showPicker?.();
    el.focus();
    el.click();
  };

  // if user navigated here without an account, show simple message
  if (!accountParam) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-center text-lg text-slate-600">
          No account number provided. Please return to the home page and enter your account.
        </p>
      </div>
    );
  }

  if (!verifiedParam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <p className="max-w-lg text-center text-lg text-slate-600">
          Identity verification is required before viewing account details. Please go back and complete ID verification.
        </p>
      </div>
    );
  }

  useEffect(() => {
    if (!accountParam) return;

    const loadAndCreateApplication = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        // hit same‑origin path; proxy rewrites /api/v1 in dev
        const res = await fetch(`/api/v1/accounts/${encodeURIComponent(accountParam)}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        // Map and normalize form data from external API (default for new/rejected)
        const mappedData = mapApiToForm(data);
        const normalizedData = normalizeDateFields(normalizeFormData(mappedData));
        const defaultData = { ...normalizedData, accountNumber: accountParam, notes: "" } as typeof initialForm;
        setDefaultFormFromApi(defaultData);
        // Customer portal: never pre-fill Notes with API/seed/admin text (e.g. "Update type:…", corporate boilerplate).
        setForm((prev) => ({ ...prev, ...normalizedData, accountNumber: accountParam, notes: "" }));
        setInitialFormData((prev) => ({ ...prev, ...normalizedData, accountNumber: accountParam, notes: "" }));

        // Ensure application record exists; new applications get PENDING. Then load from sanitation_db by status.
        try {
          const postRes = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountNumber: accountParam,
              recordNumber: data.record_number || `REC-${Date.now()}`,
              ...mappedData,
              notes: "",
            }),
          });
          if (postRes.ok) {
            const app = await postRes.json();
            setApplicationFromDb(app);
            const status = (app.status ?? "").toString().toUpperCase();

            if (status === "DECLINED" || status === "REJECTED") {
              setForm({ ...defaultData, status: "DECLINED", notes: "" });
              setInitialFormData({ ...defaultData, status: "DECLINED", notes: "" });
            } else {
              const fromDb = normalizeDateFields({ ...app, accountNumber: accountParam } as Partial<typeof initialForm>);
              setForm((prev) => ({ ...prev, ...fromDb, notes: "" }));
              setInitialFormData((prev) => ({ ...prev, ...fromDb, notes: "" }));
            }
          }
        } catch {
          // Record may already exist or create failed; form already set from external API
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load account";
        setLoadError(errorMsg);
        toast.error(`Account Error: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadAndCreateApplication();
  }, [accountParam]);

  // Note: notifications are shown on landing page only.

  const inputClass = (readOnly: boolean) =>
    readOnly
      ? "w-full rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 text-sm text-neutral-900 cursor-default read-only:outline-none"
      : "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300";

  const hasBlockingModal = showConfirmation || showDiscardConfirm || showSuccessModal;

  return (
    <div className={`relative flex min-h-screen min-h-[100dvh] flex-col bg-[#f5f4f0] ${hasBlockingModal ? "overflow-hidden" : ""}`}>
      <style>{`
        @keyframes app-card-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .app-details-card {
          animation: app-card-fade-up 0.35s ease-out;
        }
        @keyframes app-footer-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .app-footer-bar {
          animation: app-footer-slide-up 0.25s ease-out;
        }
        @keyframes app-edit-section-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .app-edit-section {
          animation: app-edit-section-in 0.25s ease-out;
        }
        @keyframes app-modal-pop {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .app-modal-card {
          animation: app-modal-pop 0.25s ease-out;
        }
      `}</style>
      {/* Header: logo left (match landing size), title true center, menu right */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-[#faf9f6]/80 backdrop-blur-md">
        <div className="relative mx-auto flex min-h-[52px] w-full max-w-6xl items-center px-3 py-2 sm:min-h-[60px] sm:px-6 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center justify-start">
            <Image
              src="/logo_aneco.png"
              alt="ANECO"
              width={160}
              height={160}
              className="h-9 w-auto max-h-9 object-contain object-left sm:h-10 sm:max-h-10 md:h-11 md:max-h-11"
              sizes="(max-width: 640px) 120px, 160px"
              priority
            />
          </div>

          <h1
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 max-w-[min(200px,calc(100%-5.5rem))] -translate-x-1/2 -translate-y-1/2 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-neutral-900 sm:max-w-[min(240px,calc(100%-6.5rem))] sm:text-xs sm:tracking-[0.18em] md:text-sm"
            style={{ letterSpacing: "0.14em" }}
          >
            APPLICATION DETAILS
          </h1>

          <div className="relative z-20 flex min-w-0 flex-1 items-center justify-end">
          {/* Mobile menu */}
          <div className="relative w-12 shrink-0 md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/80 bg-white text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50"
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            {/* Dropdown menu */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-neutral-200/80 bg-[#faf9f6] shadow-lg">
                  <nav className="py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-neutral-900 transition-all hover:bg-white active:scale-[0.98]"
                    >
                      <svg className="h-5 w-5 shrink-0 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit information
                    </button>
                    <Link
                      href="/"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </Link>
                  </nav>
                </div>
              </>
            )}
          </div>
          {/* Balance width on md+ where hamburger is hidden */}
          <div className="hidden h-10 w-12 shrink-0 md:block" aria-hidden />
          </div>
        </div>
      </header>
      {/* Main - centered minimal card */}
      <main className="relative flex min-h-0 flex-1 w-full flex-col items-center overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-32 lg:justify-center">
        <div className="app-details-card relative w-full max-w-6xl rounded-2xl border border-neutral-200/80 bg-[#faf9f6] px-4 py-6 shadow-sm sm:px-6 sm:py-8">
          {/* Your Information (centered) */}
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="text-xl font-medium tracking-tight text-neutral-900 sm:text-2xl" style={{ letterSpacing: "-0.02em" }}>
              Your information
            </h2>
            <p className="mt-2 text-xs text-neutral-500 sm:text-sm">
              Carefully review your details before submitting. You can edit fields as needed.
            </p>
          </div>

          {loading && (
            <p className="py-10 text-center text-sm text-neutral-500">Loading application…</p>
          )}
          {loadError && (
            <p className="py-10 text-center text-sm text-red-600">{loadError}</p>
          )}

          <form
            id="verify-form"
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              openReviewChangesModal();
            }}
          >
            {/* Summary – Account only; status is shown via notification */}
            <div>
              <div className="rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Account</p>
                <p className="mt-1 truncate text-sm font-semibold text-neutral-900">
                  {form.accountNumber || accountParam || "—"}
                </p>
              </div>
            </div>

            {/* Application type */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
                Application Type
              </label>
              <p className="rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 text-sm text-neutral-900">
                {form.appType === "new" || form.appType === "NEW"
                  ? "As New Member"
                  : form.appType === "change" || form.appType === "CHANGE"
                    ? "As Change/New Occupant"
                    : form.appType || "—"}
              </p>
            </div>

            {/* Membership type */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
                Membership Type
              </label>
              <p className="rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 text-sm text-neutral-900">
                {form.membership === "household" || form.membership === "HOUSEHOLD" ? "Household" : form.membership === "corporate" || form.membership === "CORPORATE" ? "Corporate/Sectoral/Business" : form.membership || "—"}
              </p>
            </div>

            {/* Record location */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Area</label>
                <input
                  type="text"
                  value={form.area ?? ""}
                  onChange={update("area")}
                  readOnly={!isEditing || !canEditField("area")}
                  placeholder="e.g. Area 2-Nasipit"
                  className={inputClass(!isEditing)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">District</label>
                <input
                  type="text"
                  value={form.district ?? ""}
                  onChange={update("district")}
                  readOnly={!isEditing || !canEditField("district")}
                  placeholder="e.g. Dist 7 - NASIPIT"
                  className={inputClass(!isEditing)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Barangay</label>
                <input
                  type="text"
                  value={form.barangay ?? ""}
                  onChange={update("barangay")}
                  readOnly={!isEditing || !canEditField("barangay")}
                  placeholder="e.g. KINABJANGAN"
                  className={inputClass(!isEditing)}
                />
              </div>
            </div>

            {/* Applicant details */}
            <div className="border-t border-neutral-200/80 pt-6">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                Applicant details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">First Name</label>
                  <input
                    type="text"
                    value={form.firstName ?? ""}
                    onChange={updateNoSymbols("firstName")}
                    readOnly={!isEditing || !canEditField("firstName")}
                    placeholder="Enter first name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Middle Name</label>
                  <input
                    type="text"
                    value={form.middleName ?? ""}
                    onChange={updateNoSymbols("middleName")}
                    readOnly={!isEditing || !canEditField("middleName")}
                    placeholder="Enter middle name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName ?? ""}
                    onChange={updateNoSymbols("lastName")}
                    readOnly={!isEditing || !canEditField("lastName")}
                    placeholder="Enter last name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Suffix Name</label>
                  <input
                    type="text"
                    value={form.suffixName ?? ""}
                    onChange={updateNoSymbols("suffixName")}
                    readOnly={!isEditing || !canEditField("suffixName")}
                    placeholder="Optional"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Birthdate</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.birthdate ?? ""}
                      onChange={updateDateIso("birthdate")}
                      readOnly
                      placeholder="Jul-24-1999"
                      inputMode="numeric"
                      pattern="[A-Za-z]{3}-\\d{2}-\\d{4}"
                      className={inputClass(true)}
                    />
                    {isEditing && canEditField("birthdate") && (
                      <>
                        <button
                          type="button"
                          onClick={() => openDatePicker(birthdatePickerRef)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                          aria-label="Open calendar"
                        >
                          Calendar
                        </button>
                        <input
                          ref={birthdatePickerRef}
                          type="date"
                          value={toIsoForDateInput(String(form.birthdate ?? ""))}
                          onChange={(e) => setForm((p) => ({ ...p, birthdate: isoToMonDdYyyy(e.target.value) || p.birthdate }))}
                          className="absolute -z-10 h-0 w-0 opacity-0"
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Gender</label>
                  {!isEditing ? (
                    <p className="rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 text-sm text-neutral-900">
                      {form.gender === "male" || form.gender === "MALE" ? "Male" : form.gender === "female" || form.gender === "FEMALE" ? "Female" : form.gender || "—"}
                    </p>
                  ) : (
                    <div className="app-edit-section space-y-2 pt-1">
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 text-sm font-medium text-neutral-900 transition-all hover:bg-neutral-50">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={form.gender?.toLowerCase?.() === "male"}
                          onChange={() => setForm((p) => ({ ...p, gender: "male" }))}
                          className="h-4 w-4 cursor-pointer"
                        />
                        <span>Male</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 text-sm font-medium text-neutral-900 transition-all hover:bg-neutral-50">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={form.gender?.toLowerCase?.() === "female"}
                          onChange={() => setForm((p) => ({ ...p, gender: "female" }))}
                          className="h-4 w-4 cursor-pointer"
                        />
                        <span>Female</span>
                      </label>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Civil Status</label>
                  {!isEditing ? (
                    <p className="rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 text-sm text-neutral-900">
                      {form.civilStatus ? form.civilStatus.charAt(0).toUpperCase() + form.civilStatus.slice(1) : "—"}
                    </p>
                  ) : (
                    <div className="app-edit-section grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
                      {["Single", "Married", "Widow/Widower", "Separated", "Annulled", "Others"].map((s) => (
                        <label key={s} className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-xs font-medium text-neutral-900 transition-all hover:bg-neutral-50">
                          <input
                            type="radio"
                            name="civilStatus"
                            value={s.toLowerCase()}
                            checked={form.civilStatus?.toLowerCase?.() === s.toLowerCase()}
                            onChange={() => setForm((p) => ({ ...p, civilStatus: s.toLowerCase() }))}
                            className="h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Spouse details */}
            <div className="border-t border-neutral-200/80 pt-6">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                Spouse details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">First Name</label>
                  <input
                    type="text"
                    value={form.spouseFirst ?? ""}
                    onChange={updateNoSymbols("spouseFirst")}
                    readOnly={!isEditing || !canEditField("spouseFirst")}
                    placeholder="Enter first name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Middle Name</label>
                  <input
                    type="text"
                    value={form.spouseMiddle ?? ""}
                    onChange={updateNoSymbols("spouseMiddle")}
                    readOnly={!isEditing || !canEditField("spouseMiddle")}
                    placeholder="Enter middle name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Last Name</label>
                  <input
                    type="text"
                    value={form.spouseLast ?? ""}
                    onChange={updateNoSymbols("spouseLast")}
                    readOnly={!isEditing || !canEditField("spouseLast")}
                    placeholder="Enter last name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Suffix Name</label>
                  <input
                    type="text"
                    value={form.spouseSuffix ?? ""}
                    onChange={updateNoSymbols("spouseSuffix")}
                    readOnly={!isEditing || !canEditField("spouseSuffix")}
                    placeholder="Optional"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Birthdate</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.spouseBirthdate ?? ""}
                      onChange={updateDateIso("spouseBirthdate")}
                      readOnly
                      placeholder="Jul-24-1999"
                      inputMode="numeric"
                      pattern="[A-Za-z]{3}-\\d{2}-\\d{4}"
                      className={inputClass(true)}
                    />
                    {isEditing && canEditField("spouseBirthdate") && (
                      <>
                        <button
                          type="button"
                          onClick={() => openDatePicker(spouseBirthdatePickerRef)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
                          aria-label="Open calendar"
                        >
                          Calendar
                        </button>
                        <input
                          ref={spouseBirthdatePickerRef}
                          type="date"
                          value={toIsoForDateInput(String(form.spouseBirthdate ?? ""))}
                          onChange={(e) => setForm((p) => ({ ...p, spouseBirthdate: isoToMonDdYyyy(e.target.value) || p.spouseBirthdate }))}
                          className="absolute -z-10 h-0 w-0 opacity-0"
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Residence address */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Residence Address</label>
              <input
                type="text"
                value={form.residenceAddress ?? ""}
                onChange={update("residenceAddress")}
                readOnly={!isEditing || !canEditField("residenceAddress")}
                placeholder="House No., Street, Purok No., Barangay, City/Municipality"
                className={inputClass(!isEditing)}
              />
            </div>

            {/* Contact information */}
            <div className="border-t border-neutral-200/80 pt-6">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                Contact information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Cellphone No.</label>
                  <input
                    type="tel"
                    value={form.cellphone ?? ""}
                    onChange={updateDigits("cellphone", 12)}
                    readOnly={!isEditing || !canEditField("cellphone")}
                    placeholder="Enter cellphone number"
                    inputMode="numeric"
                    maxLength={12}
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Landline No.</label>
                  <input
                    type="tel"
                    value={form.landline ?? ""}
                    onChange={updateDigits("landline")}
                    readOnly={!isEditing || !canEditField("landline")}
                    placeholder="Enter landline number"
                    inputMode="numeric"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">E-mail Address</label>
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={updateEmail("email")}
                    readOnly={!isEditing || !canEditField("email")}
                    placeholder="Enter email address"
                    pattern=".+@.+"
                    className={inputClass(!isEditing)}
                  />
                </div>
              </div>
            </div>

            {/* Co-signatory & Witness */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Co-signatory (Full Name)</label>
                <input
                  type="text"
                  value={form.cosignatory ?? ""}
                  onChange={updateNoSymbols("cosignatory")}
                  readOnly={!isEditing || !canEditField("cosignatory")}
                  placeholder="Enter full name"
                  className={inputClass(!isEditing)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Witness</label>
                <input
                  type="text"
                  value={form.witness ?? ""}
                  onChange={updateNoSymbols("witness")}
                  readOnly={!isEditing || !canEditField("witness")}
                  placeholder="Enter witness name"
                  className={inputClass(!isEditing)}
                />
              </div>
            </div>

            {/* Contract status */}
            <div className="border-t border-neutral-200/80 pt-6">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
                Contract status
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Status</label>
                  <input
                    type="text"
                    value={form.status ?? ""}
                    onChange={update("status")}
                    readOnly={!isEditing || !canEditField("status")}
                    placeholder="e.g. Signed up"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">OR Number</label>
                  <input
                    type="text"
                    value={form.orNumber ?? ""}
                    onChange={update("orNumber")}
                    readOnly={!isEditing || !canEditField("orNumber")}
                    placeholder="Enter OR number"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Date Issued</label>
                  <input
                    type="text"
                    value={form.dateIssued ?? ""}
                    onChange={update("dateIssued")}
                    readOnly={!isEditing || !canEditField("dateIssued")}
                    placeholder="MM/DD/YYYY"
                    className={inputClass(!isEditing)}
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes ?? ""}
                  onChange={update("notes")}
                  readOnly={!isEditing || !canEditField("notes")}
                  placeholder="Enter notes"
                  className={inputClass(!isEditing)}
                />
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer - actions only when editing (sticky bottom bar) */}
      {isEditing && (
        <footer className="app-footer-bar fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/80 bg-[#faf9f6]/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl gap-3 px-4 py-3 sm:gap-4 sm:px-6">
            <button
              type="submit"
              form="verify-form"
              className="flex-1 rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.97] sm:py-3.5"
            >
              Review changes
            </button>
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="flex-1 rounded-xl border border-neutral-200/80 bg-white py-3 text-sm font-medium text-neutral-900 shadow-sm transition-all hover:bg-neutral-50 active:scale-[0.97] sm:py-3.5"
            >
              Cancel
            </button>
          </div>
        </footer>
      )}

      {/* Discard confirmation when cancelling edits */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="app-modal-card w-full max-w-sm rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-6 shadow-xl sm:p-8">
            <p className="text-center text-sm font-medium text-neutral-900 sm:text-base">
              Discard your changes?
            </p>
            <p className="mt-2 text-center text-xs text-neutral-500 sm:text-sm">
              Any edits you made will be lost if you cancel.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="w-full rounded-xl border border-neutral-200/80 bg-white py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(initialFormData);
                  setIsEditing(false);
                  setShowDiscardConfirm(false);
                  router.push(`/verify-customer/landing?account=${encodeURIComponent(accountParam || "")}&verified=1`);
                }}
                className="w-full rounded-xl bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review changes (before API submit) */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="app-modal-card flex w-full max-w-sm max-h-[85vh] flex-col rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-6 shadow-xl sm:p-8">
            <div className="flex flex-1 flex-col items-center text-center min-h-0">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <svg
                  className="h-6 w-6 text-neutral-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-medium text-neutral-900">Review your changes</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                Please review the summary below. Your updates are not saved until you tap Submit changes.
              </p>
              {lastChangeSummary.length > 0 ? (
                <div className="mt-4 w-full flex-1 min-h-0 overflow-y-auto space-y-2 text-left text-sm text-neutral-700 pr-1">
                  {lastChangeSummary.map((item) => (
                    <div key={item.label} className="rounded-xl border border-neutral-200/80 bg-white px-3.5 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">{item.label}</p>
                      <div className="mt-2 flex flex-col gap-2 text-xs sm:flex-row sm:gap-3">
                        <div className="min-w-0 flex-1 rounded-lg border border-neutral-200/90 bg-white px-2.5 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500">Before</p>
                          <p className="mt-1 truncate font-medium text-neutral-800">{item.before}</p>
                        </div>
                        <div className="min-w-0 flex-1 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-800">After</p>
                          <p className="mt-1 truncate font-semibold text-emerald-950">{item.after}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-500">No visible field changes were detected.</p>
              )}
              {submitError && (
                <div className="mt-4 w-full rounded-lg border border-neutral-200/90 bg-white p-3 text-left shadow-sm">
                  <p className="text-sm text-neutral-800">Could not save your changes. Please try again.</p>
                </div>
              )}
              <div className="mt-6 flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmation(false);
                    setSubmitError(null);
                    setIsEditing(true);
                  }}
                  className="w-full rounded-xl border border-neutral-200/80 bg-white py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
                >
                  Add more changes
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitApplication()}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting…" : "Submit changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* After successful PATCH */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="app-modal-card w-full max-w-sm rounded-2xl border border-neutral-200/80 bg-[#faf9f6] p-6 shadow-xl sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-neutral-900">Submitted successfully</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                Your information has been submitted. You can return to your account home when you are ready.
              </p>
              <button
                type="button"
                className="mt-8 w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push(`/verify-customer/landing?account=${encodeURIComponent(accountParam || "")}&verified=1`);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

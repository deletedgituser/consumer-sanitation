"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { mapFormToApi } from "@/lib/account-verification";
import { getCustomerApplicationCategoryDisplay } from "@/lib/customer-application-category";

type Customer = {
  id: string;
  recordNumber: string;
  appType: "new" | "change";
  membership: "household" | "corporate";
  area: string;
  district: string;
  barangay: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffixName: string;
  birthdate: string;
  noMiddleName: boolean;
  gender: "male" | "female";
  civilStatus: string;
  spouseFirst: string;
  spouseMiddle: string;
  spouseLast: string;
  spouseSuffix: string;
  spouseBirthdate: string;
  residenceAddress: string;
  cellphone: string;
  contactNumberForContacting: string;
  landline: string;
  email: string;
  privacyConsent: boolean;
  privacyNewsletter: boolean;
  privacyEmail: boolean;
  privacySms: boolean;
  privacyPhone: boolean;
  privacySocial: boolean;
  cosignatory: string;
  witness: string;
  status: string;
  orNumber: string;
  dateIssued: string;
  notes: string;
  accountNumber: string;
  /** Customer portal (landing): simple_correction | change_owner_purchase | change_owner_inheritance */
  customerUpdateReason?: string | null;
  pendingDiff?: Record<string, { before: string; after: string }> | null;
  /** ISO timestamps from the Application row; used to sort the recent list. */
  createdAt?: string;
  updatedAt?: string;
};

// activity log type returned from /api/logs
interface ActivityLog {
  id: string;
  action: string;
  description: string;
  userId?: string;
  user?: { id: string; username?: string; name?: string } | null;
  userEmail?: string | null;
  applicationId?: string | null;
  metadata?: any;
  createdAt: string;
}

const sectionHeaderClass = "rounded-t-lg bg-[#3D45AA] px-4 py-2 text-sm font-semibold text-white";

function CustomerDetail({
  customer,
  onBack,
  theme,
  onApprove,
  onDecline,
  onEdit,
  isEditing,
  onRequestDone,
  onCancel,
}: {
  customer: Customer;
  onBack: () => void;
  theme: Theme;
  onApprove?: () => void;
  onDecline?: () => void;
  onEdit?: () => void;
  isEditing?: boolean;
  onRequestDone?: (draft: Customer) => void;
  onCancel?: () => void;
}) {
  const isDark = theme === "dark";
  const isPending = normalizeStatus(customer.status) === "pending";
  const applicationCategory = useMemo(() => {
    const fromDb = getCustomerApplicationCategoryDisplay(customer.customerUpdateReason ?? undefined);
    if (fromDb) return fromDb;
    const notes = (customer.notes ?? "").toString();
    const match = notes.match(/^\s*Update type\s*:\s*(.+)\s*$/im);
    const legacy = match?.[1]?.trim();
    if (legacy) return { title: legacy, subtitle: "" };
    return null;
  }, [customer.customerUpdateReason, customer.notes]);
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textMuted = isDark ? "text-slate-300" : "text-slate-500";
  const boxClass = isDark
    ? "mt-1.5 rounded-b-lg border border-slate-600 bg-slate-700/50 px-4 py-3"
    : "mt-1.5 rounded-b-lg border border-slate-200 bg-slate-50/50 px-4 py-3";
  const btnClass = isDark
    ? "rounded-lg border border-slate-500 bg-slate-700 px-3 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-slate-600 active:scale-[0.98]"
    : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]";
  const editBtnClass = "rounded-md border border-[#3D45AA] bg-[#3D45AA] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[#323b96] active:scale-[0.98]";
  const approveBtnClass = "rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]";
  const declineBtnClass = "rounded-md border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]";
  const doneBtnClass = "rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]";
  const cancelBtnClass = isDark
    ? "rounded-md border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-600 active:scale-[0.98]"
    : "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]";
  const inputClass = isDark
    ? "w-full rounded border border-slate-500 bg-slate-700 text-white px-2 py-1.5 text-sm focus:border-[#FFF19B] focus:outline-none focus:ring-1 focus:ring-[#FFF19B]"
    : "w-full rounded border border-slate-300 bg-white text-slate-800 px-2 py-1.5 text-sm focus:border-[#3D45AA] focus:outline-none focus:ring-1 focus:ring-[#3D45AA]";

  const [draft, setDraft] = useState<Customer>(customer);
  // removed modal state; handled by parent
  useEffect(() => {
    if (isEditing) setDraft(customer);
  }, [isEditing, customer]);

  const display = isEditing ? draft : customer;
  const setDisplay = setDraft;

  const diffLabels: Record<string, string> = {
    appType: "Application type",
    membership: "Membership",
    area: "Area",
    district: "District",
    barangay: "Barangay",
    firstName: "First name",
    middleName: "Middle name",
    lastName: "Last name",
    suffixName: "Suffix",
    birthdate: "Birthdate",
    noMiddleName: "No middle name",
    gender: "Gender",
    civilStatus: "Civil status",
    spouseFirst: "Spouse first name",
    spouseMiddle: "Spouse middle name",
    spouseLast: "Spouse last name",
    spouseSuffix: "Spouse suffix",
    spouseBirthdate: "Spouse birthdate",
    residenceAddress: "Residence address",
    cellphone: "Cellphone",
    contactNumberForContacting: "Contact number (for contacting only)",
    landline: "Landline",
    email: "Email",
    privacyConsent: "Privacy consent",
    privacyNewsletter: "Privacy — newsletter",
    privacyEmail: "Privacy — email",
    privacySms: "Privacy — SMS",
    privacyPhone: "Privacy — phone",
    privacySocial: "Privacy — social",
    cosignatory: "Co-signatory",
    witness: "Witness",
    notes: "Notes",
    customerUpdateReason: "Update reason",
  };

  const pendingDiffEntries = useMemo(() => {
    const diff = customer.pendingDiff;
    if (!diff || typeof diff !== "object") return [];
    return Object.entries(diff)
      // Admin-only workflow fields – never surface on the customer-changes summary.
      .filter(([k]) => k !== "status" && k !== "orNumber" && k !== "dateIssued")
      .map(([k, v]) => ({
        key: k,
        label: diffLabels[k] ?? k,
        before: (v?.before ?? "").toString(),
        after: (v?.after ?? "").toString(),
      }));
  }, [customer.pendingDiff]);

  const updatedHeaderClass = isDark
    ? "rounded-t-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
    : "rounded-t-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white";

  const updatedHeader = (label: string) => (
    <div className="flex items-center gap-2">
      <span>{label}</span>
      <span
        className={
          isDark
            ? "rounded-full bg-emerald-900/30 px-2 py-0.5 text-[11px] font-bold text-emerald-100"
            : "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-900"
        }
      >
        (New)
      </span>
    </div>
  );

  const getAfter = (key: string) => {
    const v = customer.pendingDiff?.[key];
    return v?.after ?? "";
  };
  const getBefore = (key: string) => {
    const v = customer.pendingDiff?.[key];
    return v?.before ?? "";
  };
  // The blue "current" cards should render the APPROVED baseline: i.e. the
  // value that existed in the DB before the customer's pending edit. While a
  // customer edit is still pending admin review, use the pendingDiff `before`
  // value so the admin can clearly compare old (blue) vs proposed (green).
  // Once the application is no longer pending (approved/declined), blue just
  // shows the value stored in the DB.
  const originalValue = (key: keyof Customer | string, current: unknown) => {
    if (isPending) {
      const pending = customer.pendingDiff?.[key as string];
      if (pending && typeof pending.before !== "undefined") {
        const s = String(pending.before ?? "");
        return s.trim() ? s : "—";
      }
    }
    const s = String(current ?? "");
    return s.trim() ? s : "—";
  };

  // Same baseline idea, but returns the raw value (string/boolean/etc.) so
  // callers can use it for conditional rendering (e.g. appType === "new").
  // Booleans in pendingDiff are stored as the strings "true"/"false".
  const baselineValue = <T,>(key: string, fallback: T): T | string | boolean => {
    if (!isPending) return fallback;
    const pending = customer.pendingDiff?.[key];
    if (!pending || typeof pending.before === "undefined") return fallback;
    const raw = pending.before;
    if (raw === "true") return true;
    if (raw === "false") return false;
    return raw;
  };

  // Render a before → after diff snippet for the "Updated Xxx" cards so the
  // admin can see exactly what the customer changed, not just the new value.
  const renderDiff = (key: string, extraClass = "") => {
    const before = getBefore(key);
    const after = getAfter(key);
    const beforeText = before && before.trim() ? before : "—";
    const afterText = after && after.trim() ? after : "—";
    return (
      <p className={`flex flex-wrap items-center gap-2 ${textPrimary} ${extraClass}`}>
        <span className={`line-through ${textMuted}`}>{beforeText}</span>
        <span aria-hidden className={textMuted}>→</span>
        <span className="font-semibold">{afterText}</span>
      </p>
    );
  };

  const hasAnyDiff = (keys: string[]) => keys.some((k) => !!customer.pendingDiff?.[k]);

  const modalOverlayClass = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4";
  const modalPanelClass = isDark
    ? "rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-xl max-w-md w-full"
    : "rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-w-md w-full";
  const modalTitleClass = isDark ? "text-lg font-semibold text-white" : "text-lg font-semibold text-slate-800";
  const modalBodyClass = isDark ? "mt-2 text-slate-300" : "mt-2 text-slate-600";
  const modalFooterClass = "mt-6 flex justify-end gap-2";

  return (
    <div className="space-y-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={`flex items-center gap-2 ${btnClass}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to list
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {applicationCategory && (
            <span
              className={`max-w-[min(100%,14rem)] truncate rounded-full px-3 py-1 text-xs font-semibold ${
                isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"
              }`}
              title={applicationCategory.subtitle ? `${applicationCategory.title} — ${applicationCategory.subtitle}` : applicationCategory.title}
            >
              {applicationCategory.title}
            </span>
          )}
          <span className={`text-sm ${isDark ? "text-[#FFF19B]" : textMuted}`}>Record #{customer.recordNumber}</span>
          {isEditing && onRequestDone && onCancel ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
              <button type="button" onClick={() => onRequestDone(draft)} className={doneBtnClass}>
                Done
              </button>
              <button type="button" onClick={onCancel} className={cancelBtnClass}>
                Cancel
              </button>
            </div>
          ) : isPending && (onApprove || onDecline || onEdit) ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
              {onEdit && (
                <button type="button" onClick={onEdit} className={editBtnClass}>
                  Edit
                </button>
              )}
              {onApprove && (
                <button type="button" onClick={onApprove} className={approveBtnClass}>
                  Approve
                </button>
              )}
              {onDecline && (
                <button type="button" onClick={onDecline} className={declineBtnClass}>
                  Decline
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Application Type + Membership Type */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Application Type</div>
        <div className={boxClass}>
          {isEditing ? (
            <select
              value={display.appType}
              onChange={(e) => setDisplay((d) => ({ ...d, appType: e.target.value as "new" | "change" }))}
              className={inputClass}
            >
              <option value="new">As New Member</option>
              <option value="change">As Change/New Occupant</option>
            </select>
          ) : (
            <p className={textPrimary}>
              {baselineValue("appType", customer.appType) === "new" ? "As New Member" : "As Change/New Occupant"}
            </p>
          )}
        </div>
        {applicationCategory && (
          <div className="mt-3">
            <div className={sectionHeaderClass}>Application category (customer)</div>
            <div className={boxClass}>
              <p className={`${textPrimary} font-medium`}>{applicationCategory.title}</p>
              {applicationCategory.subtitle ? (
                <p className={`mt-1.5 text-sm ${textMuted}`}>{applicationCategory.subtitle}</p>
              ) : null}
            </div>
          </div>
        )}
        <div className={`mt-3 ${sectionHeaderClass}`}>Membership Type</div>
        <div className={boxClass}>
          {isEditing ? (
            <select
              value={display.membership}
              onChange={(e) => setDisplay((d) => ({ ...d, membership: e.target.value as "household" | "corporate" }))}
              className={inputClass}
            >
              <option value="household">Household</option>
              <option value="corporate">Corporate/Sectoral/Business</option>
            </select>
          ) : (
            <p className={textPrimary}>
              {baselineValue("membership", customer.membership) === "household"
                ? "Household"
                : "Corporate/Sectoral/Business"}
            </p>
          )}
        </div>
      </div>

      {/* Updated Application Type / Membership (only changed fields) */}
      {isPending &&
        !isEditing &&
        hasAnyDiff(["appType", "membership"]) && (
          <div className="mb-4">
            <div className={updatedHeaderClass}>{updatedHeader("Updated Application Type")}</div>
            <div className={`${boxClass} space-y-3`}>
              {customer.pendingDiff?.appType && (
                <div>
                  <p className={`text-xs font-medium ${textMuted}`}>Application Type</p>
                  {renderDiff("appType")}
                </div>
              )}
              {customer.pendingDiff?.membership && (
                <div>
                  <p className={`text-xs font-medium ${textMuted}`}>Membership Type</p>
                  {renderDiff("membership")}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Account Number */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Account Number</div>
        <div className={boxClass}>
          {isEditing ? (
            <input
              type="text"
              value={display.accountNumber}
              disabled
              className={inputClass + " opacity-50 cursor-not-allowed"}
            />
          ) : (
            <p className={textPrimary}>{customer.accountNumber}</p>
          )}
        </div>
      </div>

      {/* Record Location (Branch) */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Record Location (Branch)</div>
        <div className={boxClass}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Area</p>
              {isEditing ? (
                <input value={display.area ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, area: e.target.value }))} className={inputClass} />
              ) : (
                <p className={textPrimary}>{originalValue("area", customer.area)}</p>
              )}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>District</p>
              {isEditing ? (
                <input value={display.district ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, district: e.target.value }))} className={inputClass} />
              ) : (
                <p className={textPrimary}>{originalValue("district", customer.district)}</p>
              )}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Barangay</p>
              {isEditing ? (
                <input value={display.barangay ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, barangay: e.target.value }))} className={inputClass} />
              ) : (
                <p className={textPrimary}>{originalValue("barangay", customer.barangay)}</p>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Record No.</p>
                <p className={`flex items-center gap-2 ${textPrimary}`}>
                  {customer.recordNumber}
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <span className="text-xs font-semibold">✓</span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Updated Record Location (only changed fields) */}
      {isPending &&
        !isEditing &&
        hasAnyDiff(["area", "district", "barangay"]) && (
          <div className="mb-4">
            <div className={updatedHeaderClass}>{updatedHeader("Updated Record Location")}</div>
            <div className={boxClass}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customer.pendingDiff?.area && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Area</p>
                    {renderDiff("area")}
                  </div>
                )}
                {customer.pendingDiff?.district && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>District</p>
                    {renderDiff("district")}
                  </div>
                )}
                {customer.pendingDiff?.barangay && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Barangay</p>
                    {renderDiff("barangay")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Applicant Information */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Applicant Information</div>
        <div className={boxClass}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>First Name</p>
                {isEditing ? <input value={display.firstName ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, firstName: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("firstName", customer.firstName)}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Middle Name</p>
                {isEditing ? <input value={display.middleName ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, middleName: e.target.value }))} className={inputClass} disabled={display.noMiddleName} /> : <p className={textPrimary}>{baselineValue("noMiddleName", customer.noMiddleName) ? "—" : originalValue("middleName", customer.middleName)}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Last Name</p>
                {isEditing ? <input value={display.lastName ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, lastName: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("lastName", customer.lastName)}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Suffix Name</p>
                {isEditing ? <input value={display.suffixName ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, suffixName: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("suffixName", customer.suffixName)}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Birthdate</p>
                {isEditing ? <input value={display.birthdate ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, birthdate: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("birthdate", customer.birthdate)}</p>}
              </div>
              <div className="flex items-end">
                {isEditing ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={display.noMiddleName} onChange={(e) => setDisplay((d) => ({ ...d, noMiddleName: e.target.checked }))} className="rounded" />
                    <span className={textMuted}>No Middle Name</span>
                  </label>
                ) : (
                  <p className={`text-sm ${textMuted}`}>{baselineValue("noMiddleName", customer.noMiddleName) ? "☑ No Middle Name" : "☐ No Middle Name"}</p>
                )}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Gender</p>
                {isEditing ? (
                  <select value={display.gender ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, gender: e.target.value as "male" | "female" }))} className={inputClass}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                ) : (
                  <p className={textPrimary}>{(() => {
                    const raw = baselineValue("gender", customer.gender);
                    const norm = String(raw ?? "").toLowerCase();
                    if (norm === "male") return "Male";
                    if (norm === "female") return "Female";
                    return "—";
                  })()}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className={`text-xs font-medium ${textMuted}`}>Civil Status</p>
                {isEditing ? <input value={display.civilStatus ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, civilStatus: e.target.value }))} className={inputClass} /> : <p className={`capitalize ${textPrimary}`}>{originalValue("civilStatus", customer.civilStatus)}</p>}
              </div>
            </div>
            <div className="flex shrink-0 justify-center sm:justify-end">
              <div className={`flex h-28 w-28 items-center justify-center rounded-lg border-2 border-dashed ${isDark ? "border-[#FFF19B]/70 bg-slate-600 text-[#FFF19B]/90" : "border-slate-300 bg-slate-100 text-slate-400"}`}>
                <span className="text-xs">Photo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Updated Applicant Information (only show changed fields) */}
      {isPending &&
        !isEditing &&
        hasAnyDiff(["firstName", "middleName", "lastName", "suffixName", "birthdate", "noMiddleName", "gender", "civilStatus"]) && (
          <div className="mb-4">
            <div className={updatedHeaderClass}>{updatedHeader("Updated Applicant Information")}</div>
            <div className={boxClass}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                  {customer.pendingDiff?.firstName && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>First Name</p>
                      {renderDiff("firstName")}
                    </div>
                  )}
                  {customer.pendingDiff?.middleName && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Middle Name</p>
                      {renderDiff("middleName")}
                    </div>
                  )}
                  {customer.pendingDiff?.lastName && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Last Name</p>
                      {renderDiff("lastName")}
                    </div>
                  )}
                  {customer.pendingDiff?.suffixName && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Suffix Name</p>
                      {renderDiff("suffixName")}
                    </div>
                  )}
                  {customer.pendingDiff?.birthdate && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Birthdate</p>
                      {renderDiff("birthdate")}
                    </div>
                  )}
                  {customer.pendingDiff?.noMiddleName && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>No Middle Name</p>
                      {renderDiff("noMiddleName")}
                    </div>
                  )}
                  {customer.pendingDiff?.gender && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Gender</p>
                      {renderDiff("gender")}
                    </div>
                  )}
                  {customer.pendingDiff?.civilStatus && (
                    <div className="sm:col-span-2">
                      <p className={`text-xs font-medium ${textMuted}`}>Civil Status</p>
                      {renderDiff("civilStatus", "capitalize")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


      {/* Applicant's Spouse */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Applicant&apos;s Spouse (Husband/Wife) Photo</div>
        <div className={boxClass}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>First Name</p>
                {isEditing ? <input value={display.spouseFirst ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, spouseFirst: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("spouseFirst", customer.spouseFirst)}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Middle Name</p>
                {isEditing ? <input value={display.spouseMiddle ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, spouseMiddle: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("spouseMiddle", customer.spouseMiddle)}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Last Name</p>
                {isEditing ? <input value={display.spouseLast ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, spouseLast: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("spouseLast", customer.spouseLast)}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Suffix Name</p>
                {isEditing ? <input value={display.spouseSuffix ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, spouseSuffix: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("spouseSuffix", customer.spouseSuffix)}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Birthdate</p>
                {isEditing ? <input value={display.spouseBirthdate ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, spouseBirthdate: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("spouseBirthdate", customer.spouseBirthdate)}</p>}
              </div>
            </div>
            <div className="flex shrink-0 justify-center sm:justify-end">
              <div className={`flex h-28 w-28 items-center justify-center rounded-lg border-2 border-dashed text-center text-xs ${isDark ? "border-[#FFF19B]/70 bg-slate-600 text-[#FFF19B]/90" : "border-slate-300 bg-slate-100 text-slate-400"}`}>
                DOUBLE CLICK TO ADD PHOTO
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Updated Spouse (only changed fields) */}
      {isPending &&
        !isEditing &&
        hasAnyDiff(["spouseFirst", "spouseMiddle", "spouseLast", "spouseSuffix", "spouseBirthdate"]) && (
          <div className="mb-4">
            <div className={updatedHeaderClass}>{updatedHeader("Updated Applicant\u0027s Spouse")}</div>
            <div className={boxClass}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                  {customer.pendingDiff?.spouseFirst && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>First Name</p>
                      {renderDiff("spouseFirst")}
                    </div>
                  )}
                  {customer.pendingDiff?.spouseMiddle && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Middle Name</p>
                      {renderDiff("spouseMiddle")}
                    </div>
                  )}
                  {customer.pendingDiff?.spouseLast && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Last Name</p>
                      {renderDiff("spouseLast")}
                    </div>
                  )}
                  {customer.pendingDiff?.spouseSuffix && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Suffix Name</p>
                      {renderDiff("spouseSuffix")}
                    </div>
                  )}
                  {customer.pendingDiff?.spouseBirthdate && (
                    <div>
                      <p className={`text-xs font-medium ${textMuted}`}>Birthdate</p>
                      {renderDiff("spouseBirthdate")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Residence & Contact */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Residence & Contact</div>
        <div className={`${boxClass} space-y-3`}>
          <div>
            <p className={`text-xs font-medium ${textMuted}`}>Residence Address</p>
            {isEditing ? <input value={display.residenceAddress ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, residenceAddress: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("residenceAddress", customer.residenceAddress)}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Cellphone No.</p>
              {isEditing ? <input value={display.cellphone ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, cellphone: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("cellphone", customer.cellphone)}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Landline No.</p>
              {isEditing ? <input value={display.landline ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, landline: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("landline", customer.landline)}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>E-mail Address</p>
              {isEditing ? <input value={display.email ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, email: e.target.value }))} className={inputClass} type="email" /> : <p className={textPrimary}>{originalValue("email", customer.email)}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Updated Residence & Contact (only changed fields) */}
      {isPending &&
        !isEditing &&
        hasAnyDiff(["residenceAddress", "cellphone", "landline", "email", "contactNumberForContacting"]) && (
          <div className="mb-4">
            <div className={updatedHeaderClass}>{updatedHeader("Updated Residence & Contact")}</div>
            <div className={`${boxClass} space-y-3`}>
              {customer.pendingDiff?.residenceAddress && (
                <div>
                  <p className={`text-xs font-medium ${textMuted}`}>Residence Address</p>
                  {renderDiff("residenceAddress")}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                {customer.pendingDiff?.cellphone && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Cellphone No.</p>
                    {renderDiff("cellphone")}
                  </div>
                )}
                {customer.pendingDiff?.landline && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Landline No.</p>
                    {renderDiff("landline")}
                  </div>
                )}
                {customer.pendingDiff?.email && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>E-mail Address</p>
                    {renderDiff("email")}
                  </div>
                )}
              </div>
              {customer.pendingDiff?.contactNumberForContacting && (
                <div>
                  <p className={`text-xs font-medium ${textMuted}`}>
                    Contact number (for contacting only)
                  </p>
                  {renderDiff("contactNumberForContacting")}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Privacy Option */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Privacy Option</div>
        <div className={boxClass}>
          {isEditing ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={display.privacyConsent} onChange={(e) => setDisplay((d) => ({ ...d, privacyConsent: e.target.checked }))} className="rounded" />
                <span className={textPrimary}>Consent for marketing communications</span>
              </label>
              {display.privacyConsent && (
                <div className="flex flex-wrap gap-4">
                  {["privacyNewsletter", "privacyEmail", "privacySms", "privacyPhone", "privacySocial"].map((key, i) => {
                    const labels = ["Newsletter", "Email", "SMS", "Phone", "Social media"];
                    const k = key as keyof Customer;
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!display[k]} onChange={(e) => setDisplay((d) => ({ ...d, [k]: e.target.checked }))} className="rounded" />
                        <span className={textMuted}>{labels[i]}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <p className={textPrimary}>
                {baselineValue("privacyConsent", customer.privacyConsent)
                  ? "Yes, I would like to receive information about the goods and services provided by ANECO, INC., via the following channels:"
                  : "No consent for marketing communications."}
              </p>
              {baselineValue("privacyConsent", customer.privacyConsent) && (
                <ul className={`mt-2 flex flex-wrap gap-4 text-sm ${textMuted}`}>
                  {baselineValue("privacyNewsletter", customer.privacyNewsletter) && <li>newsletter</li>}
                  {baselineValue("privacyEmail", customer.privacyEmail) && <li>email</li>}
                  {baselineValue("privacySms", customer.privacySms) && <li>text message</li>}
                  {baselineValue("privacyPhone", customer.privacyPhone) && <li>telephone call</li>}
                  {baselineValue("privacySocial", customer.privacySocial) && <li>social media</li>}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* Updated Privacy Option (only changed fields) */}
      {isPending &&
        !isEditing &&
        hasAnyDiff([
          "privacyConsent",
          "privacyNewsletter",
          "privacyEmail",
          "privacySms",
          "privacyPhone",
          "privacySocial",
        ]) && (
          <div className="mb-4">
            <div className={updatedHeaderClass}>{updatedHeader("Updated Privacy Option")}</div>
            <div className={boxClass}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customer.pendingDiff?.privacyConsent && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Consent</p>
                    {renderDiff("privacyConsent")}
                  </div>
                )}
                {customer.pendingDiff?.privacyNewsletter && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Newsletter</p>
                    {renderDiff("privacyNewsletter")}
                  </div>
                )}
                {customer.pendingDiff?.privacyEmail && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Email</p>
                    {renderDiff("privacyEmail")}
                  </div>
                )}
                {customer.pendingDiff?.privacySms && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>SMS</p>
                    {renderDiff("privacySms")}
                  </div>
                )}
                {customer.pendingDiff?.privacyPhone && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Phone</p>
                    {renderDiff("privacyPhone")}
                  </div>
                )}
                {customer.pendingDiff?.privacySocial && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Social media</p>
                    {renderDiff("privacySocial")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Co-signatory, Witness, Contract Status */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Other Details</div>
        <div className={boxClass}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Co-signatory</p>
              {isEditing ? <input value={display.cosignatory ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, cosignatory: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("cosignatory", customer.cosignatory)}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Witness</p>
              {isEditing ? <input value={display.witness ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, witness: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{originalValue("witness", customer.witness)}</p>}
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Contract Status</p>
              {isEditing ? <input value={display.status ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, status: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.status}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>OR Number</p>
              {isEditing ? <input value={display.orNumber ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, orNumber: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.orNumber}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Date Issued</p>
              {isEditing ? <input value={display.dateIssued ?? ""} onChange={(e) => setDisplay((d) => ({ ...d, dateIssued: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.dateIssued}</p>}
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-xs font-medium ${textMuted}`}>Notes</p>
            {isEditing ? <textarea value={display.notes} onChange={(e) => setDisplay((d) => ({ ...d, notes: e.target.value }))} className={`${inputClass} min-h-[80px]`} rows={3} /> : <p className={textPrimary}>{originalValue("notes", customer.notes)}</p>}
          </div>
        </div>
      </div>

      {/* Updated Other Details (only changed fields) */}
      {isPending &&
        !isEditing &&
        hasAnyDiff(["cosignatory", "witness", "notes", "customerUpdateReason"]) && (
          <div className="mb-4">
            <div className={updatedHeaderClass}>{updatedHeader("Updated Other Details")}</div>
            <div className={boxClass}>
              <div className="grid gap-3 sm:grid-cols-2">
                {customer.pendingDiff?.cosignatory && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Co-signatory</p>
                    {renderDiff("cosignatory")}
                  </div>
                )}
                {customer.pendingDiff?.witness && (
                  <div>
                    <p className={`text-xs font-medium ${textMuted}`}>Witness</p>
                    {renderDiff("witness")}
                  </div>
                )}
              </div>
              {customer.pendingDiff?.customerUpdateReason && (
                <div className="mt-3">
                  <p className={`text-xs font-medium ${textMuted}`}>Update reason</p>
                  {renderDiff("customerUpdateReason")}
                </div>
              )}
              {customer.pendingDiff?.notes && (
                <div className="mt-3">
                  <p className={`text-xs font-medium ${textMuted}`}>Notes</p>
                  {renderDiff("notes")}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

type NavId = "dashboard" | "pending" | "approved" | "declined" | "logs" | "statistics";
type Theme = "light" | "dark";

const normalizeStatus = (status: unknown) => String(status ?? "").trim().toLowerCase();

const navItems: { id: NavId; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: "pending",
    label: "Pending Application",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "approved",
    label: "Approved Application",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "declined",
    label: "Declined Application",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "logs",
    label: "Logs",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: "statistics",
    label: "Statistics",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

function ApplicationsTable({
  customers,
  onView,
  searchQuery,
  theme,
}: {
  customers: Customer[];
  onView: (c: Customer) => void;
  searchQuery: string;
  theme: Theme;
}) {
  const filtered = searchQuery.trim()
    ? customers.filter(
        (c) =>
          `${c.firstName} ${c.lastName} ${c.recordNumber} ${c.area} ${c.barangay}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : customers;

  const thClass = theme === "dark" ? "px-4 py-3 font-semibold text-white" : "px-4 py-3 font-semibold text-slate-700";
  const tdClass = theme === "dark" ? "px-4 py-3 text-white" : "px-4 py-3 text-slate-800";
  const tdMutedClass = theme === "dark" ? "px-4 py-3 text-slate-200" : "px-4 py-3 text-slate-600";

  return (
    <div className="overflow-x-auto rounded-lg overflow-hidden">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className={theme === "dark" ? "border-b border-slate-600 bg-slate-700" : "border-b border-slate-200 bg-slate-50"}>
            <th className={thClass}>Account Number</th>
            <th className={thClass}>Record #</th>
            <th className={thClass}>Name</th>
            <th className={thClass}>Contact Number</th>
            <th className={thClass}>Area</th>
            <th className={thClass}>Barangay</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>OR Number</th>
            <th className={thClass}>Date Issued</th>
            <th className={thClass}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr
              key={c.id}
              className={`border-b transition-all duration-200 ease-out hover:bg-[#FFF19B]/20 ${
                theme === "dark" ? "border-slate-600" : "border-slate-100"
              }`}
            >
              <td className={tdClass}>{c.accountNumber}</td>
              <td className={tdClass}>{c.recordNumber}</td>
              <td className={`${theme === "dark" ? "px-4 py-3 font-medium text-white" : "px-4 py-3 font-medium text-slate-800"}`}>
                {c.firstName} {c.middleName ? c.middleName.charAt(0) + "." : ""} {c.lastName}
              </td>
              <td className={tdMutedClass}>{c.contactNumberForContacting || "—"}</td>
              <td className={tdMutedClass}>{c.area}</td>
              <td className={tdMutedClass}>{c.barangay}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 ${
                    c.status === "Pending"
                      ? "bg-[#FFF19B] text-slate-800"
                      : c.status === "Declined"
                        ? theme === "dark"
                          ? "bg-red-900/50 text-red-200"
                          : "bg-red-100 text-red-800"
                        : theme === "dark"
                          ? "bg-emerald-900/50 text-emerald-200"
                          : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {c.status}
                </span>
              </td>
              <td className={tdMutedClass}>{c.orNumber}</td>
              <td className={tdMutedClass}>{c.dateIssued}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onView(c)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out hover:bg-[#F8843F] active:scale-95 ${
                  theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
                }`}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selected, setSelected] = useState<Customer | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<NavId>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [customerEdits, setCustomerEdits] = useState<Record<string, Customer>>({});
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // edit confirmation state
  const [doneConfirmOpen, setDoneConfirmOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<Customer | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  
  // API state
  const [applications, setApplications] = useState<Customer[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type AdminNotification = {
    id: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
    application?: {
      id: string;
      accountNumber: string | null;
      recordNumber: string;
      firstName: string;
      lastName: string;
      status: string;
      createdAt: string;
    } | null;
  };

  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSince, setNotifSince] = useState<string | null>(null);

  // logs state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // shared table classes for log view
  const thClassMain = theme === "dark" ? "px-4 py-3 font-semibold text-white" : "px-4 py-3 font-semibold text-slate-700";
  const tdClassMain = theme === "dark" ? "px-4 py-3 text-white" : "px-4 py-3 text-slate-800";
  const tdMutedClassMain = theme === "dark" ? "px-4 py-3 text-slate-200" : "px-4 py-3 text-slate-600";

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      setLogsError(null);
      const response = await fetch("/api/logs");
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data: ActivityLog[] = await response.json();
      setLogs(data);
    } catch {
      setLogsError("Failed to load logs");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const getEffectiveStatus = (c: Customer) => statusOverrides[c.id] ?? c.status;

  const mapApiApplicationToCustomer = (app: any): Customer => ({
    id: app.id,
    recordNumber: app.recordNumber,
    appType: app.appType.toLowerCase(),
    membership: app.membership.toLowerCase(),
    area: app.area,
    district: app.district,
    barangay: app.barangay,
    firstName: app.firstName,
    middleName: app.middleName,
    lastName: app.lastName,
    suffixName: app.suffixName || "",
    birthdate: app.birthdate,
    noMiddleName: app.noMiddleName,
    gender: app.gender.toLowerCase(),
    civilStatus: app.civilStatus,
    spouseFirst: app.spouseFirst || "",
    spouseMiddle: app.spouseMiddle || "",
    spouseLast: app.spouseLast || "",
    spouseSuffix: app.spouseSuffix || "",
    spouseBirthdate: app.spouseBirthdate || "",
    residenceAddress: app.residenceAddress,
    cellphone: app.cellphone || "",
    contactNumberForContacting: app.contactNumberForContacting || "",
    landline: app.landline || "",
    email: app.email,
    privacyConsent: app.privacyConsent,
    privacyNewsletter: app.privacyNewsletter,
    privacyEmail: app.privacyEmail,
    privacySms: app.privacySms,
    privacyPhone: app.privacyPhone,
    privacySocial: app.privacySocial,
    cosignatory: app.cosignatory || "",
    witness: app.witness || "",
    status:
      app.status === "SIGNED_UP"
        ? "Signed up"
        : app.status === "PENDING"
          ? "Pending"
          : app.status === "APPROVED"
            ? "Approved"
            : app.status === "DECLINED"
              ? "Declined"
              : app.status,
    orNumber: app.orNumber,
    dateIssued: app.dateIssued,
    notes: app.notes || "",
    accountNumber: app.accountNumber || "",
    createdAt: app.createdAt ?? undefined,
    updatedAt: app.updatedAt ?? undefined,
    customerUpdateReason: (() => {
      if (app.customerUpdateReason != null) return app.customerUpdateReason;
      const logs = Array.isArray(app.activityLogs) ? app.activityLogs : [];
      const customerLog = logs.find((l: any) => {
        const md = l?.metadata;
        if (!md?.diff) return false;
        if (md?.source === "customer") return true;
        return !l?.userId;
      });
      return customerLog?.metadata?.customerUpdateReason ?? null;
    })(),
    pendingDiff: (() => {
      const logs = Array.isArray(app.activityLogs) ? app.activityLogs : [];
      if (logs.length === 0) return null;

      const isCustomerLog = (l: any) => {
        const md = l?.metadata;
        if (!md?.diff) return false;
        if (md?.source === "customer") return true;
        return !l?.userId;
      };

      // Cutoff: the most recent admin approve/decline. Any customer edit
      // on or before that timestamp is considered resolved.
      const adminActionLog = logs.find((l: any) =>
        l?.action === "APPLICATION_APPROVED" || l?.action === "APPLICATION_DECLINED",
      );
      const cutoffTs = adminActionLog?.createdAt
        ? new Date(adminActionLog.createdAt).getTime()
        : 0;

      // Show ONLY the most recent customer submission's diff (after the
      // admin cutoff). Each customer save is treated as a fresh "pending
      // review" snapshot; the admin sees exactly what the customer just
      // changed, not an accumulation of every past edit.
      const latestCustomerLog = logs.find((l: any) => {
        if (!isCustomerLog(l)) return false;
        const logTs = l?.createdAt ? new Date(l.createdAt).getTime() : 0;
        return logTs > cutoffTs;
      });

      const diff = latestCustomerLog?.metadata?.diff;
      if (!diff || typeof diff !== "object") return null;

      // Normalize before/after to strings and drop no-op entries.
      const cleaned: Record<string, { before: string; after: string }> = {};
      for (const [key, val] of Object.entries(diff) as [string, any][]) {
        if (!val || typeof val !== "object") continue;
        const before = String(val.before ?? "");
        const after = String(val.after ?? "");
        if (before === after) continue;
        cleaned[key] = { before, after };
      }

      return Object.keys(cleaned).length > 0 ? cleaned : null;
    })(),
  });

  // Calculate counts
  const pendingCount = applications.filter((c) => normalizeStatus(getEffectiveStatus(c)) === "pending").length;
  const approvedCount = applications.filter((c) => {
    const s = normalizeStatus(getEffectiveStatus(c));
    return s === "approved" || s === "signed up" || s === "signed_up";
  }).length;
  const declinedCount = applications.filter((c) => normalizeStatus(getEffectiveStatus(c)) === "declined").length;

  // Fetch applications from API
  const fetchApplications = async () => {
    try {
      setIsLoadingApplications(true);
      setError(null);
      const response = await fetch("/api/applications");
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg =
          data && typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Request failed";
        throw new Error(`${response.status} — ${msg}`);
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid response: expected a list of applications");
      }

      const mappedData = data.map((app: any) => mapApiApplicationToCustomer(app));
      setApplications(mappedData);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load applications";
      setError(
        message.includes("—")
          ? message
          : `Failed to load applications (${message}). Check that you are signed in and the database is reachable.`,
      );
    } finally {
      setIsLoadingApplications(false);
    }
  };

  const fetchApplicationByAccount = async (accountNumber: string): Promise<Customer | null> => {
    try {
      const resp = await fetch(`/api/applications/${encodeURIComponent(accountNumber)}`);
      if (!resp.ok) throw new Error("Failed to fetch application");
      const app = await resp.json();
      const mapped = mapApiApplicationToCustomer(app);
      setApplications((prev) => {
        const idx = prev.findIndex((c) => c.accountNumber === accountNumber);
        if (idx === -1) {
          return [mapped, ...prev];
        }
        const next = [...prev];
        next[idx] = mapped;
        return next;
      });
      return mapped;
    } catch {
      return null;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/admin-login");
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin-login");
    }
  }, [status, router]);

  // Fetch applications on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchApplications();
    }
  }, [status]);

  // Load theme from localStorage on mount; persist when changed
  useEffect(() => {
    const stored = localStorage.getItem("admin-theme") as Theme | null;
    if (stored === "dark" || stored === "light") setTheme(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem("admin-theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setNotifError(null);
      const resp = await fetch("/api/notifications?unread=false&limit=20");
      if (!resp.ok) throw new Error("Failed to fetch notifications");
      const data = await resp.json();
      // newest first from API
      setNotifications(data);
    } catch (e) {
      setNotifError(e instanceof Error ? e.message : "Failed to fetch notifications");
    }
  };

  // Notifications: SSE + polling fallback
  useEffect(() => {
    if (status !== "authenticated") return;
    let es: EventSource | null = null;
    let pollTimer: number | null = null;
    let stopped = false;

    const startPolling = () => {
      if (pollTimer) return;
      void fetchNotifications();
      pollTimer = window.setInterval(() => {
        void fetchNotifications();
      }, 20000);
    };

    // initial fetch
    void fetchNotifications();

    try {
      const url = new URL("/api/notifications/stream", window.location.origin);
      if (notifSince) url.searchParams.set("since", notifSince);
      es = new EventSource(url.toString());

      es.addEventListener("ready", (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data);
          if (payload?.since) setNotifSince(String(payload.since));
        } catch {
          // ignore
        }
      });

      es.addEventListener("notification", (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data) as { notifications?: AdminNotification[]; since?: string };
          if (payload?.since) setNotifSince(String(payload.since));
          const incoming = Array.isArray(payload?.notifications) ? payload.notifications : [];
          if (incoming.length === 0) return;

          // merge new notifications (dedupe by id) while keeping newest-first order
          setNotifications((prev) => {
            const seen = new Set(prev.map((n) => n.id));
            const merged = [...incoming.filter((n) => !seen.has(n.id)).reverse(), ...prev];
            return merged.slice(0, 50);
          });
        } catch {
          // ignore malformed
        }
      });

      es.onerror = () => {
        if (stopped) return;
        try {
          es?.close();
        } catch {
          // ignore
        }
        es = null;
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      stopped = true;
      if (pollTimer) window.clearInterval(pollTimer);
      try {
        es?.close();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const markNotificationsRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    // optimistic update
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    try {
      const resp = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, read: true }),
      });
      if (!resp.ok) throw new Error("Failed to mark notifications read");
    } catch {
      // re-fetch to reconcile if patch fails
      void fetchNotifications();
    }
  };

  const markNotificationsUnread = async (ids: string[]) => {
    if (ids.length === 0) return;
    // optimistic update
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: false } : n)));
    try {
      const resp = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, read: false }),
      });
      if (!resp.ok) throw new Error("Failed to mark notifications unread");
    } catch {
      void fetchNotifications();
    }
  };

  const handleNotificationClick = async (n: AdminNotification) => {
    await markNotificationsRead([n.id]);
    const acct = n.application?.accountNumber ?? null;
    if (acct) {
      const fresh = await fetchApplicationByAccount(acct);
      if (fresh) {
        // Ensure we show the latest server state when opening from notifications.
        // Stale local drafts/overrides can hide actions until a full refresh.
        setCustomerEdits((prev) => {
          if (!prev[fresh.id]) return prev;
          const next = { ...prev };
          delete next[fresh.id];
          return next;
        });
        setStatusOverrides((prev) => {
          if (!prev[fresh.id]) return prev;
          const next = { ...prev };
          delete next[fresh.id];
          return next;
        });
        setSelected(fresh);
        setDetailEditMode(false);
        const normalized = normalizeStatus(fresh.status);
        if (normalized === "pending") setActiveNav("pending");
        else if (normalized === "declined") setActiveNav("declined");
        else if (normalized === "approved" || normalized === "signed up" || normalized === "signed_up") setActiveNav("approved");
        else setActiveNav("dashboard");
      }
    }
    setNotifMenuOpen(false);
  };

  // fetch logs when logs view is selected
  useEffect(() => {
    if (activeNav === "logs" && status === "authenticated") {
      fetchLogs();
    }
  }, [activeNav, status]);

  const showApplications =
    activeNav === "dashboard" || activeNav === "pending" || activeNav === "approved" || activeNav === "declined";
  const filteredCustomers =
    activeNav === "dashboard"
      ? applications
      : activeNav === "pending"
        ? applications.filter((c) => normalizeStatus(getEffectiveStatus(c)) === "pending")
        : activeNav === "approved"
          ? applications.filter((c) => {
              const s = normalizeStatus(getEffectiveStatus(c));
              return s === "approved" || s === "signed up" || s === "signed_up";
            })
          : activeNav === "declined"
            ? applications.filter((c) => normalizeStatus(getEffectiveStatus(c)) === "declined")
            : applications;

  // Sort by most recent activity (updatedAt preferred, falls back to createdAt)
  // so the row the customer just edited — or the admin just approved/declined —
  // floats to the top of the list.
  const listCustomers = [...filteredCustomers].sort((a, b) => {
    const aTs = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTs = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTs - aTs;
  });

  const effectiveSelected =
    selected
      ? (customerEdits[selected.id] ?? { ...selected, status: getEffectiveStatus(selected) })
      : null;

  const handleApprove = async (c: Customer) => {
    try {
      if (!c.accountNumber) {
        alert("This application has no account number yet, cannot approve.");
        return;
      }

      // Step 1: Approve in local backend
      const response = await fetch(
        `/api/applications/${encodeURIComponent(c.accountNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        },
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(
          `[admin] PATCH approve failed for ${c.accountNumber} (HTTP ${response.status}):`,
          errText,
        );
        throw new Error(`Failed to approve application: HTTP ${response.status} ${errText}`);
      }

      // Step 2: Sync approved status to FastAPI backend with Bearer token
      const fastApiBase = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000";
      const authToken = (session?.user as any)?.apiToken;

      if (authToken) {
        const sourceData = customerEdits[c.id] ?? c;
        const syncPayload = {
          ...mapFormToApi(sourceData as unknown as Record<string, unknown>),
          status: "APPROVED",
        };

        try {
          const syncResponse = await fetch(
            `${fastApiBase}/api/v1/accounts/${encodeURIComponent(c.accountNumber)}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify(syncPayload),
            },
          );

          if (!syncResponse.ok) {
            alert(`Warning: Approved locally but FastAPI sync failed (${syncResponse.status}). Please check manually.`);
          }
        } catch {
          alert("Warning: Approved locally but failed to sync to FastAPI backend. Please check manually.");
        }
      } else {
        alert("Warning: Admin session token not available. Application approved locally only.");
      }

      setStatusOverrides((prev) => ({ ...prev, [c.id]: "Approved" }));
      setSelected(null);
      setApproveModalOpen(false);
      setSuccessModalOpen(true);
      
      // Refresh applications
      await fetchApplications();
      // Refresh logs after action
      await fetchLogs();
    } catch (err) {
      console.error("[admin] handleApprove error:", err);
      const detail = err instanceof Error ? err.message : String(err);
      alert(`Failed to approve application. ${detail}`);
    }
  };

  const handleDecline = async (c: Customer) => {
    try {
      if (!c.accountNumber) {
        alert("This application has no account number yet, cannot decline.");
        return;
      }

      // Step 1: Decline in local backend
      const response = await fetch(
        `/api/applications/${encodeURIComponent(c.accountNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "decline" }),
        },
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(
          `[admin] PATCH decline failed for ${c.accountNumber} (HTTP ${response.status}):`,
          errText,
        );
        throw new Error(`Failed to decline application: HTTP ${response.status} ${errText}`);
      }

      // Step 2: Sync decline status to FastAPI backend with Bearer token
      const fastApiBase = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000";
      const authToken = (session?.user as any)?.apiToken;

      if (authToken) {
        const syncPayload = {
          status: "DECLINED",
        };

        try {
          const syncResponse = await fetch(
            `${fastApiBase}/api/v1/accounts/${encodeURIComponent(c.accountNumber)}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify(syncPayload),
            },
          );

          if (!syncResponse.ok) {
            alert(`Warning: Declined locally but FastAPI sync failed (${syncResponse.status}). Please check manually.`);
          }
        } catch {
          alert("Warning: Declined locally but failed to sync to FastAPI backend. Please check manually.");
        }
      } else {
        alert("Warning: Admin session token not available. Application declined locally only.");
      }

      setStatusOverrides((prev) => ({ ...prev, [c.id]: "Declined" }));
      setSelected(null);
      setDeclineModalOpen(false);
      
      // Refresh applications
      await fetchApplications();
      // Refresh logs after action
      await fetchLogs();
    } catch (err) {
      console.error("[admin] handleDecline error:", err);
      const detail = err instanceof Error ? err.message : String(err);
      alert(`Failed to decline application. ${detail}`);
    }
  };

  const handleDraftRequest = (draft: Customer) => {
    setPendingDraft(draft);
    setDoneConfirmOpen(true);
  };

  const handleDoneEdit = async (draft: Customer) => {
    try {
      const response = await fetch(`/api/applications/${draft.accountNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          ...draft,
          appType: draft.appType.toUpperCase(),
          membership: draft.membership.toUpperCase(),
          gender: draft.gender.toUpperCase(),
          status: draft.status === "Signed up" ? "SIGNED_UP" :
                  draft.status === "Pending" ? "PENDING" :
                  draft.status === "Approved" ? "APPROVED" :
                  draft.status === "Declined" ? "DECLINED" : draft.status,
        }),
      });

      if (!response.ok) throw new Error("Failed to update application");

      setCustomerEdits((prev) => ({ ...prev, [draft.id]: draft }));
      setDetailEditMode(false);
      
      // Refresh applications
      await fetchApplications();
      // Refresh logs after edit
      await fetchLogs();
    } catch {
      alert("Failed to update application. Please try again.");
    }
  };

  const handleView = async (c: Customer) => {
    // Always try to load the freshest record (includes customer diff logs)
    const fresh = c.accountNumber ? await fetchApplicationByAccount(c.accountNumber) : null;
    const next = fresh ?? c;
    setSelected(next);
    setDetailEditMode(false);
    const normalized = normalizeStatus(getEffectiveStatus(next));
    if (normalized === "pending") setActiveNav("pending");
    else if (normalized === "declined") setActiveNav("declined");
    else if (normalized === "approved" || normalized === "signed up" || normalized === "signed_up") setActiveNav("approved");
    else setActiveNav("dashboard");
  };

  const modalOverlayClass = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4";
  const modalPanelClass = theme === "dark"
    ? "rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-xl max-w-md w-full"
    : "rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-w-md w-full";
  const modalTitleClass = theme === "dark" ? "text-lg font-semibold text-white" : "text-lg font-semibold text-slate-800";
  const modalBodyClass = theme === "dark" ? "mt-2 text-slate-300" : "mt-2 text-slate-600";
  const modalFooterClass = "mt-6 flex justify-end gap-2";

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen in useEffect)
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        theme === "dark" ? "bg-slate-900" : "bg-[#e8eaf0]"
      }`}
    >
      {/* Approve confirmation modal */}
      {approveModalOpen && effectiveSelected && (
        <div className={modalOverlayClass} onClick={() => setApproveModalOpen(false)}>
          <div className={modalPanelClass} onClick={(e) => e.stopPropagation()}>
            <h3 className={modalTitleClass}>Confirm approval</h3>
            <p className={modalBodyClass}>Are you sure you want to approve this application?</p>
            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className={theme === "dark" ? "rounded-lg border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600" : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApprove(effectiveSelected)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline confirmation modal */}
      {declineModalOpen && effectiveSelected && (
        <div className={modalOverlayClass} onClick={() => setDeclineModalOpen(false)}>
          <div className={modalPanelClass} onClick={(e) => e.stopPropagation()}>
            <h3 className={modalTitleClass}>Confirm declinement</h3>
            <p className={modalBodyClass}>Are you sure you want to decline this application?</p>
            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className={theme === "dark" ? "rounded-lg border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600" : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecline(effectiveSelected)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit confirmation modal */}
      {doneConfirmOpen && pendingDraft && (
        <div className={modalOverlayClass} onClick={() => setDoneConfirmOpen(false)}>
          <div className={modalPanelClass} onClick={(e) => e.stopPropagation()}>
            <h3 className={modalTitleClass}>Confirm edits</h3>
            <p className={modalBodyClass}>Save the changes made to this application?</p>
            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => setDoneConfirmOpen(false)}
                className={theme === "dark" ? "rounded-lg border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600" : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (pendingDraft) {
                    await handleDoneEdit(pendingDraft);
                  }
                  setDoneConfirmOpen(false);
                  setPendingDraft(null);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal (after approve) */}
      {successModalOpen && (
        <div className={modalOverlayClass} onClick={() => setSuccessModalOpen(false)}>
          <div className={modalPanelClass} onClick={(e) => e.stopPropagation()}>
            <h3 className={modalTitleClass}>Submission submitted</h3>
            <p className={modalBodyClass}>The submission has been submitted successfully.</p>
            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => setSuccessModalOpen(false)}
                className={theme === "dark" ? "rounded-lg bg-[#3D45AA] px-4 py-2 text-sm font-medium text-white hover:opacity-90" : "rounded-lg bg-[#3D45AA] px-4 py-2 text-sm font-medium text-white hover:opacity-90"}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: fixed so it stays visible when main content is scrolled */}
      <aside
        className={`fixed left-0 top-0 z-20 flex h-screen flex-col border-r shadow-sm transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-56 overflow-hidden" : "w-0 overflow-hidden"
        } ${theme === "dark" ? "border-slate-700 bg-slate-800 rounded-r-lg" : "border-slate-200 bg-white rounded-r-lg"}`}
      >
        <div
          className={`flex min-h-[56px] shrink-0 items-center gap-3 border-b px-3 ${
            theme === "dark" ? "border-slate-600" : "border-slate-100"
          }`}
        >
          <Image
            src="/logo_aneco.png"
            alt="ANECO"
            width={44}
            height={44}
            className="shrink-0 object-contain"
          />
          <span
            className={`truncate text-base font-bold ${theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"}`}
          >
            Admin Panel
          </span>
          <div className="flex flex-1 items-center justify-end min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ease-out hover:bg-[#FFF19B]/50 active:scale-95 ${
                theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
              aria-label="Toggle sidebar"
            >
              <span className="relative block h-5 w-5">
                <span
                  className={`absolute left-0 right-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    sidebarOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0.5"
                  }`}
                />
                <span
                  className={`absolute left-0 right-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    sidebarOpen ? "opacity-0" : "top-1/2 -translate-y-1/2"
                  }`}
                />
                <span
                  className={`absolute left-0 right-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    sidebarOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-hidden p-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveNav(item.id);
                setSelected(null);
                setDetailEditMode(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] ${
                activeNav === item.id
                  ? "bg-[#F8843F] text-white shadow-sm"
                  : theme === "dark"
                    ? "text-slate-300 hover:bg-[#FFF19B]/20 hover:text-white"
                    : "text-slate-700 hover:bg-[#FFF19B]/40 hover:text-slate-900"
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main: header + content — margin-left so content doesn't sit under fixed sidebar */}
      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? "ml-56" : "ml-0"
        }`}
      >
        {/* Top header: show hamburger only when sidebar is closed */}
        <header
          className={`flex min-h-[56px] items-center gap-4 border-b px-4 shadow-sm ${
            theme === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
          }`}
        >
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-all duration-200 ease-out hover:bg-[#FFF19B]/50 hover:text-slate-900 active:scale-95"
              aria-label="Open sidebar"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="flex flex-1 items-center gap-2">
            <input
              type="search"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`h-10 flex-1 max-w-md rounded-lg border px-3 text-sm transition-all duration-200 ease-out focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-600 bg-slate-700 text-slate-100 placeholder:text-slate-400 focus:border-[#FFF19B] focus:ring-[#FFF19B]/20"
                  : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-[#3D45AA] focus:ring-[#3D45AA]/20"
              }`}
            />
            <button
              type="button"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ease-out hover:bg-[#F8843F] active:scale-95 ${
                theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
              }`}
              aria-label="Search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notifMenuRef}>
              <button
                type="button"
                onClick={() => setNotifMenuOpen((o) => !o)}
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out hover:scale-105 active:scale-95 ${
                  theme === "dark" ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="Notifications"
                aria-expanded={notifMenuOpen}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F8843F] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifMenuOpen && (
                <div
                  className={`absolute right-0 top-full z-50 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-xl border shadow-lg ${
                    theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className={`flex items-center justify-between border-b px-4 py-3 ${theme === "dark" ? "border-slate-700" : "border-slate-100"}`}>
                    <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                      Notifications
                    </p>
                    <div className="flex items-center gap-3">
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => markNotificationsUnread(notifications.map((n) => n.id))}
                          className={`text-xs font-semibold hover:underline ${
                            theme === "dark" ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          Mark all unread
                        </button>
                      )}
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markNotificationsRead(notifications.filter((n) => !n.read).map((n) => n.id))}
                          className={`text-xs font-semibold hover:underline ${
                            theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"
                          }`}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  {notifError && (
                    <div className={`px-4 py-3 text-sm ${theme === "dark" ? "text-red-200" : "text-red-700"}`}>
                      {notifError}
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className={`px-4 py-6 text-center text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-500"}`}>
                        No new notifications.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.slice(0, 20).map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => void handleNotificationClick(n)}
                              className={`w-full px-4 py-3 text-left transition-colors ${
                                theme === "dark"
                                  ? n.read
                                    ? "bg-slate-800 hover:bg-slate-700/60"
                                    : "bg-slate-800 hover:bg-slate-700/80"
                                  : n.read
                                    ? "bg-white hover:bg-slate-50"
                                    : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`truncate text-sm font-semibold ${
                                    theme === "dark"
                                      ? n.read ? "text-slate-300" : "text-slate-100"
                                      : n.read ? "text-slate-500" : "text-slate-800"
                                  }`}>
                                    {n.application?.recordNumber ? `Record #${n.application.recordNumber}` : "Application update"}
                                  </p>
                                  <p className={`mt-0.5 line-clamp-2 text-xs ${
                                    theme === "dark"
                                      ? n.read ? "text-slate-500" : "text-slate-300"
                                      : n.read ? "text-slate-400" : "text-slate-600"
                                  }`}>
                                    {n.message}
                                  </p>
                                  {n.application?.firstName && (
                                    <p className={`mt-1 text-xs ${
                                      theme === "dark"
                                        ? n.read ? "text-slate-500" : "text-slate-400"
                                        : n.read ? "text-slate-400" : "text-slate-500"
                                    }`}>
                                      {n.application.firstName} {n.application.lastName}
                                    </p>
                                  )}
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  n.type === "PENDING"
                                    ? "bg-amber-100 text-amber-700"
                                    : n.type === "APPROVED"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : n.type === "DECLINED"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-slate-100 text-slate-700"
                                }`}>
                                  {n.type}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ease-out hover:scale-105 hover:bg-[#F8843F] active:scale-95 ${
                theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
              }`}
                aria-label="Profile and settings"
                aria-expanded={profileMenuOpen}
              >
                {session?.user?.name?.[0]?.toUpperCase() || "A"}
              </button>
              {profileMenuOpen && (
                <div
                  className={`absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border shadow-lg ${
                    theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Profile section */}
                  <div
                    className={`border-b p-4 ${theme === "dark" ? "border-slate-600" : "border-slate-100"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
                          theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
                        }`}
                      >
                        {session?.user?.name?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}
                        >
                          {session?.user?.name || "Admin User"}
                        </p>
                        <p
                          className={`truncate text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                        >
                          {session?.user?.email || "admin@example.com"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Settings: theme toggle */}
                  <div className="p-3">
                    <p
                      className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Settings
                    </p>
                    <div
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                        theme === "dark" ? "bg-slate-700/50" : "bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}
                      >
                        Theme
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={theme === "dark"}
                        onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          theme === "dark"
                            ? "bg-[#FFF19B] focus:ring-[#FFF19B]"
                            : "bg-slate-300 focus:ring-[#3D45AA]"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            theme === "dark" ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <p
                      className={`mt-1.5 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {theme === "light" ? "Light mode" : "Dark mode"}
                    </p>
                    {/* Logout button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        theme === "dark"
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-6xl">
            {effectiveSelected ? (
              <div
                className={`admin-animate-in rounded-2xl border p-4 shadow-sm sm:p-6 ${
                  theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                }`}
              >
                <CustomerDetail
                  customer={effectiveSelected}
                  onBack={() => { setSelected(null); setDetailEditMode(false); }}
                  theme={theme}
                  isEditing={detailEditMode}
                  onEdit={normalizeStatus(effectiveSelected.status) === "pending" ? () => setDetailEditMode(true) : undefined}
                  onRequestDone={handleDraftRequest}
                  onCancel={() => setDetailEditMode(false)}
                  onApprove={
                    normalizeStatus(effectiveSelected.status) === "pending"
                      ? () => setApproveModalOpen(true)
                      : undefined
                  }
                  onDecline={
                    normalizeStatus(effectiveSelected.status) === "pending"
                      ? () => setDeclineModalOpen(true)
                      : undefined
                  }
                />
              </div>
            ) : showApplications ? (
              <div key={activeNav} className="admin-animate-in">
                {/* Metric cards */}
                <div className="mb-6 grid gap-4 grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-5">
                  <button
                    type="button"
                    onClick={() => { setActiveNav("dashboard"); setSelected(null); setDetailEditMode(false); }}
                    className={`w-full rounded-xl p-4 text-left shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3D45AA] ${
                      theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
                    }`}
                  >
                    <p className="text-2xl font-bold">{isLoadingApplications ? "..." : applications.length}</p>
                    <p className="mt-1 text-sm font-medium opacity-90">Total Applications</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveNav("pending"); setSelected(null); setDetailEditMode(false); }}
                    className="w-full rounded-xl bg-[#F8843F] p-4 text-left text-white shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F8843F]"
                  >
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="mt-1 text-sm font-medium opacity-90">Pending</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveNav("approved"); setSelected(null); setDetailEditMode(false); }}
                    className={`w-full rounded-xl p-4 text-left shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3D45AA] ${
                      theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
                    }`}
                  >
                    <p className="text-2xl font-bold">{approvedCount}</p>
                    <p className="mt-1 text-sm font-medium opacity-90">Approved</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveNav("declined"); setSelected(null); setDetailEditMode(false); }}
                    className={`w-full rounded-xl p-4 text-left shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                      theme === "dark" ? "bg-red-900/80 text-red-100" : "bg-red-600 text-white"
                    }`}
                  >
                    <p className="text-2xl font-bold">{declinedCount}</p>
                    <p className="mt-1 text-sm font-medium opacity-90">Declined</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveNav("dashboard"); setSelected(null); setDetailEditMode(false); }}
                    className="w-full rounded-xl bg-[#F8843F] p-4 text-left text-white shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F8843F]"
                  >
                    <p className="text-2xl font-bold">70</p>
                    <p className="mt-1 text-sm font-medium opacity-90">This Month</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                {/* Recent Applications card */}
                <div
                  className={`rounded-2xl border p-4 shadow-sm transition-shadow duration-200 md:p-5 hover:shadow-md ${
                    theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2
                      className={`text-lg font-bold ${theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"}`}
                    >
                      {activeNav === "dashboard"
                        ? "Recent Applications"
                        : activeNav === "pending"
                          ? "Pending Applications"
                          : activeNav === "approved"
                            ? "Approved Applications"
                            : "Declined Applications"}
                    </h2>
                    
                  </div>
                  <ApplicationsTable
                    customers={listCustomers}
                    onView={handleView}
                    searchQuery={searchQuery}
                    theme={theme}
                  />
                  {isLoadingApplications && (
                    <div className="flex justify-center items-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                      <p className="ml-3 text-slate-500">Loading applications...</p>
                    </div>
                  )}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
                      <p className="text-red-600">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeNav === "logs" ? (
              <div
                className={`admin-animate-in rounded-2xl border p-8 shadow-sm ${
                  theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                }`}
              >
                <h2
                  className={`mb-4 text-lg font-bold ${theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"}`}
                >
                  Logs
                </h2>
                {isLoadingLogs ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    <p className="ml-3 text-slate-500">Loading logs...</p>
                  </div>
                ) : logsError ? (
                  <p className="text-red-600">{logsError}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className={theme === "dark" ? "border-b border-slate-600 bg-slate-700" : "border-b border-slate-200 bg-slate-50"}>
                          <th className={thClassMain}>Time</th>
                          <th className={thClassMain}>User</th>
                          <th className={thClassMain}>Action</th>
                          <th className={thClassMain}>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className={tdMutedClassMain}>
                              No logs available.
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => (
                            <tr
                              key={log.id}
                              className={`border-b transition-all duration-200 ease-out hover:bg-[#FFF19B]/20 ${
                                theme === "dark" ? "border-slate-600" : "border-slate-100"
                              }`}
                            >
                              <td className={tdMutedClassMain}>{new Date(log.createdAt).toLocaleString()}</td>
                              <td className={tdClassMain}>{log.user?.name || log.user?.username || log.userEmail || "—"}</td>
                              <td className={tdClassMain}>{(() => {
                                const a = log.action.replace(/^APPLICATION_/, "").replace(/_/g, " ");
                                return a.charAt(0).toUpperCase() + a.slice(1).toLowerCase();
                              })()}</td>
                              <td className={tdClassMain}>{log.description}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`admin-animate-in rounded-2xl border p-8 shadow-sm ${
                  theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                }`}
              >
                <h2
                  className={`mb-4 text-lg font-bold ${theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"}`}
                >
                  Statistics
                </h2>
                <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
                  Charts and statistics will appear here.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

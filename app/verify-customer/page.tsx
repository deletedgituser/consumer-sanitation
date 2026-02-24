"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const initialForm = {
  accountNumber: "B0000111223",
  appType: "new",
  membership: "household",
  area: "Area 2-Nasipit",
  district: "Dist 7 - NASIPIT",
  barangay: "KINABJANGAN",
  firstName: "JHONELLE",
  middleName: "AYENSA",
  lastName: "ALMEROL",
  suffixName: "",
  birthdate: "10/20/1988",
  gender: "male",
  civilStatus: "married",
  spouseFirst: "Maria",
  spouseMiddle: "Santos",
  spouseLast: "Almerol",
  spouseBirthdate: "01/01/1990",
  residenceAddress: "D-1, BRGY. KINABJANGAN, NASIPIT, AGUSAN DEL NORTE",
  cellphone: "09976059397",
  landline: "(085) 123-4567",
  email: "jhonelle.almerol@example.com",
  cosignatory: "Juan Dela Cruz",
  witness: "Pedro Reyes",
  status: "Signed up",
  orNumber: "896052",
  dateIssued: "11/18/2021",
  notes: "Application verified and approved.",
};

export default function VerifyCustomerPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmitApplication = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Generate a record number (in production, this should come from backend)
      const recordNumber = `${Date.now().toString().slice(-6)}`;

      // Prepare the application data
      const applicationData = {
        recordNumber,
        accountNumber: form.accountNumber,
        appType: form.appType.toUpperCase(),
        membership: form.membership.toUpperCase(),
        area: form.area,
        district: form.district,
        barangay: form.barangay,
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        suffixName: form.suffixName || "",
        birthdate: form.birthdate,
        noMiddleName: !form.middleName,
        gender: form.gender.toUpperCase(),
        civilStatus: form.civilStatus,
        spouseFirst: form.spouseFirst || "",
        spouseMiddle: form.spouseMiddle || "",
        spouseLast: form.spouseLast || "",
        spouseSuffix: "",
        spouseBirthdate: form.spouseBirthdate,
        residenceAddress: form.residenceAddress,
        cellphone: form.cellphone,
        landline: form.landline || "",
        email: form.email,
        privacyConsent: true,
        privacyNewsletter: false,
        privacyEmail: false,
        privacySms: false,
        privacyPhone: false,
        privacySocial: false,
        cosignatory: form.cosignatory || "",
        witness: form.witness || "",
        status: "PENDING",
        orNumber: form.orNumber,
        dateIssued: form.dateIssued,
        notes: form.notes || "",
      };

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit application");
      }

      // Show success modal
      setShowSubmitConfirm(false);
      setShowConfirmation(true);
      setIsEditing(false);
    } catch (error) {
      console.error("Error submitting application:", error);
      setSubmitError("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const inputClass = (readOnly: boolean) =>
    readOnly
      ? "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 cursor-default read-only:outline-none"
      : "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const userInitials =
    form.firstName.charAt(0) + (form.middleName ? form.middleName.charAt(0) : form.lastName.charAt(0));
  const displayName =
    form.firstName + (form.middleName ? " " + form.middleName.charAt(0) + "." : "");

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-slate-100">
      {/* Header - dark bar */}
      <header className="flex min-h-[52px] items-center justify-start border-b border-slate-200 bg-slate-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/logo_aneco.png"
            alt="ANECO"
            width={48}
            height={48}
            className="shrink-0 object-contain"
          />
          <h1 className="shrink-0 truncate text-lg font-bold text-white">
            Aneco Membership Application
          </h1>
        </div>
      </header>

      {/* Main - white content area */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="relative mx-auto w-full max-w-2xl bg-white px-4 py-6 sm:px-6 sm:py-8">
          {/* Your Information (centered) + hamburger on right */}
          <div className="flex items-center justify-between gap-4">
            <div className="w-10 shrink-0" aria-hidden />
            <h2 className="flex-1 text-center text-xl font-bold text-slate-800">Your Information</h2>
            <div className="relative w-10 shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex flex-col justify-center gap-1 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Menu"
                aria-expanded={menuOpen}
              >
                <span className="block h-0.5 w-6 rounded-full bg-current" />
                <span className="block h-0.5 w-6 rounded-full bg-current" />
                <span className="block h-0.5 w-6 rounded-full bg-current" />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-3 shadow-lg">
                    <div className="flex flex-col items-center border-b border-slate-100 px-4 pb-4 pt-1">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xl font-semibold text-white">
                        {userInitials}
                      </div>
                      <p className="mt-2 text-center text-sm font-semibold text-slate-800">
                        {displayName}
                      </p>
                      <p className="mt-0.5 text-center text-xs text-slate-500">{form.email}</p>
                    </div>
                    <nav className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <div className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <span className="text-xs font-semibold">✓</span>
                        </span>
                        <div>
                          <p className="font-medium text-slate-700">Status</p>
                          <p className="text-xs text-slate-500">{form.status}</p>
                        </div>
                      </div>
                      <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
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
          </div>
          <div className="mx-auto mt-2 mb-6 h-px w-16 bg-slate-300" />

          <form
            id="verify-form"
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setShowSubmitConfirm(true);
            }}
          >
            {/* Application type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Application Type
              </label>
              {!isEditing ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800">
                  {form.appType === "new" ? "As New Member" : "As Change/New Occupant"}
                </p>
              ) : (
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="appType"
                      value="new"
                      checked={form.appType === "new"}
                      onChange={() => setForm((p) => ({ ...p, appType: "new" }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">As New Member</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="appType"
                      value="change"
                      checked={form.appType === "change"}
                      onChange={() => setForm((p) => ({ ...p, appType: "change" }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">As Change/New Occupant</span>
                  </label>
                </div>
              )}
            </div>

            {/* Membership type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Membership Type
              </label>
              {!isEditing ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800">
                  {form.membership === "household" ? "Household" : "Corporate/Sectoral/Business"}
                </p>
              ) : (
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="membership"
                      value="household"
                      checked={form.membership === "household"}
                      onChange={() => setForm((p) => ({ ...p, membership: "household" }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">Household</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="membership"
                      value="corporate"
                      checked={form.membership === "corporate"}
                      onChange={() => setForm((p) => ({ ...p, membership: "corporate" }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-slate-700">Corporate/Sectoral/Business</span>
                  </label>
                </div>
              )}
            </div>

            {/* Account number – always read-only, shown under Membership */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Account Number
              </label>
              <input
                type="text"
                value={form.accountNumber}
                readOnly
                className={inputClass(true)}
              />
            </div>

            {/* Record location */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Area</label>
                <input
                  type="text"
                  value={form.area}
                  onChange={update("area")}
                  readOnly={!isEditing}
                  placeholder="e.g. Area 2-Nasipit"
                  className={inputClass(!isEditing)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">District</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={update("district")}
                  readOnly={!isEditing}
                  placeholder="e.g. Dist 7 - NASIPIT"
                  className={inputClass(!isEditing)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Barangay</label>
                <input
                  type="text"
                  value={form.barangay}
                  onChange={update("barangay")}
                  readOnly={!isEditing}
                  placeholder="e.g. KINABJANGAN"
                  className={inputClass(!isEditing)}
                />
              </div>
            </div>

            {/* Applicant details */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Applicant Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={update("firstName")}
                    readOnly={!isEditing}
                    placeholder="Enter first name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Middle Name</label>
                  <input
                    type="text"
                    value={form.middleName}
                    onChange={update("middleName")}
                    readOnly={!isEditing}
                    placeholder="Enter middle name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={update("lastName")}
                    readOnly={!isEditing}
                    placeholder="Enter last name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Suffix Name</label>
                  <input
                    type="text"
                    value={form.suffixName}
                    onChange={update("suffixName")}
                    readOnly={!isEditing}
                    placeholder="Optional"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Birthdate</label>
                  <input
                    type="text"
                    value={form.birthdate}
                    onChange={update("birthdate")}
                    readOnly={!isEditing}
                    placeholder="MM/DD/YYYY"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Gender</label>
                  {!isEditing ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800">
                      {form.gender === "male" ? "Male" : "Female"}
                    </p>
                  ) : (
                    <div className="flex gap-4 pt-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={form.gender === "male"}
                          onChange={() => setForm((p) => ({ ...p, gender: "male" }))}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-slate-700">Male</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={form.gender === "female"}
                          onChange={() => setForm((p) => ({ ...p, gender: "female" }))}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-slate-700">Female</span>
                      </label>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Civil Status</label>
                  {!isEditing ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 capitalize">
                      {form.civilStatus}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {["Single", "Married", "Widow/Widower", "Separated", "Annulled", "Others"].map((s) => (
                        <label key={s} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="civilStatus"
                            value={s.toLowerCase()}
                            checked={form.civilStatus === s.toLowerCase()}
                            onChange={() => setForm((p) => ({ ...p, civilStatus: s.toLowerCase() }))}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-slate-700">{s}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Spouse details */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Applicant&apos;s Spouse Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Spouse First Name</label>
                  <input
                    type="text"
                    value={form.spouseFirst}
                    onChange={update("spouseFirst")}
                    readOnly={!isEditing}
                    placeholder="Enter first name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Spouse Middle Name</label>
                  <input
                    type="text"
                    value={form.spouseMiddle}
                    onChange={update("spouseMiddle")}
                    readOnly={!isEditing}
                    placeholder="Enter middle name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Spouse Last Name</label>
                  <input
                    type="text"
                    value={form.spouseLast}
                    onChange={update("spouseLast")}
                    readOnly={!isEditing}
                    placeholder="Enter last name"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Spouse Birthdate</label>
                  <input
                    type="text"
                    value={form.spouseBirthdate}
                    onChange={update("spouseBirthdate")}
                    readOnly={!isEditing}
                    placeholder="MM/DD/YYYY"
                    className={inputClass(!isEditing)}
                  />
                </div>
              </div>
            </div>

            {/* Residence address */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Residence Address</label>
              <input
                type="text"
                value={form.residenceAddress}
                onChange={update("residenceAddress")}
                readOnly={!isEditing}
                placeholder="House No., Street, Purok No., Barangay, City/Municipality"
                className={inputClass(!isEditing)}
              />
            </div>

            {/* Contact information */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Contact Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Cellphone No.</label>
                  <input
                    type="tel"
                    value={form.cellphone}
                    onChange={update("cellphone")}
                    readOnly={!isEditing}
                    placeholder="Enter cellphone number"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Landline No.</label>
                  <input
                    type="tel"
                    value={form.landline}
                    onChange={update("landline")}
                    readOnly={!isEditing}
                    placeholder="Enter landline number"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    readOnly={!isEditing}
                    placeholder="Enter email address"
                    className={inputClass(!isEditing)}
                  />
                </div>
              </div>
            </div>

            {/* Co-signatory & Witness */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Co-signatory (Full Name)</label>
                <input
                  type="text"
                  value={form.cosignatory}
                  onChange={update("cosignatory")}
                  readOnly={!isEditing}
                  placeholder="Enter full name"
                  className={inputClass(!isEditing)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Witness</label>
                <input
                  type="text"
                  value={form.witness}
                  onChange={update("witness")}
                  readOnly={!isEditing}
                  placeholder="Enter witness name"
                  className={inputClass(!isEditing)}
                />
              </div>
            </div>

            {/* Contract status */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Contract Status</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                  <input
                    type="text"
                    value={form.status}
                    onChange={update("status")}
                    readOnly={!isEditing}
                    placeholder="e.g. Signed up"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">OR Number</label>
                  <input
                    type="text"
                    value={form.orNumber}
                    onChange={update("orNumber")}
                    readOnly={!isEditing}
                    placeholder="Enter OR number"
                    className={inputClass(!isEditing)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Date Issued</label>
                  <input
                    type="text"
                    value={form.dateIssued}
                    onChange={update("dateIssued")}
                    readOnly={!isEditing}
                    placeholder="MM/DD/YYYY"
                    className={inputClass(!isEditing)}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={update("notes")}
                  readOnly={!isEditing}
                  placeholder="Enter notes"
                  className={inputClass(!isEditing)}
                />
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer - Verify & Cancel only when editing */}
      {isEditing && (
        <footer className="flex flex-shrink-0 gap-4 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-2xl gap-4">
            <button
              type="submit"
              form="verify-form"
              className="flex-1 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-[rgba(245,158,11,0.25)] active:scale-[0.98]"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 rounded-xl border border-slate-300 bg-slate-100 py-3.5 text-base font-bold text-slate-700 transition-colors hover:bg-slate-200 active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </footer>
      )}

      {/* "Do you want to proceed?" confirmation */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <p className="text-center text-slate-800">
              Do you want to proceed with submitting your information?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Proceed"}
              </button>
            </div>
            {submitError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-7 w-7 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Submission confirmed</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Please wait for a call to verify your information. Your application is pending
                approval.
              </p>
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-[rgba(245,158,11,0.25)]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

type TicketStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
type TicketCategory = "ID_MISSPELLED" | "NO_ID" | "ID_IN_4PS" | "OTHER";

type Ticket = {
  id: string;
  name: string;
  address: string;
  location: string | null;
  phoneNumber: string;
  accountNumber: string | null;
  category: TicketCategory;
  message: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: TicketStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  resolvedBy: { id: string; name: string | null; username: string } | null;
  createdAt: string;
  updatedAt: string;
};

type ApplicationDetails = Record<string, unknown> & {
  accountNumber?: string | null;
  recordNumber?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffixName?: string | null;
  status?: string | null;
  area?: string | null;
  district?: string | null;
  barangay?: string | null;
  residenceAddress?: string | null;
  cellphone?: string | null;
  contactNumberForContacting?: string | null;
  landline?: string | null;
  email?: string | null;
  appType?: string | null;
  membership?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  spouseFirst?: string | null;
  spouseMiddle?: string | null;
  spouseLast?: string | null;
  spouseSuffix?: string | null;
  spouseBirthdate?: string | null;
  noMiddleName?: boolean | null;
  cosignatory?: string | null;
  witness?: string | null;
  notes?: string | null;
  orNumber?: string | null;
  dateIssued?: string | null;
  customerUpdateReason?: string | null;
  activityLogs?: Array<{
    id?: string;
    action?: string;
    userId?: string | null;
    createdAt?: string;
    metadata?: { source?: string; diff?: Record<string, { before?: string; after?: string }> } | null;
  }>;
};

type EditableApplication = {
  accountNumber: string;
  recordNumber: string;
  appType: string;
  membership: string;
  area: string;
  district: string;
  barangay: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffixName: string;
  birthdate: string;
  noMiddleName: boolean;
  gender: string;
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
  cosignatory: string;
  witness: string;
  status: string;
  orNumber: string;
  dateIssued: string;
  notes: string;
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  ID_MISSPELLED: "ID Misspelled",
  NO_ID: "No ID",
  ID_IN_4PS: "ID written in 4Ps",
  OTHER: "Other",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 border-amber-200",
  IN_REVIEW: "bg-blue-100 text-blue-800 border-blue-200",
  RESOLVED: "bg-green-100 text-green-800 border-green-200",
  CLOSED: "bg-neutral-200 text-neutral-700 border-neutral-300",
};

const STATUS_FILTERS: { value: "ALL" | TicketStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function computePendingDiff(
  logs: ApplicationDetails["activityLogs"]
): Record<string, { before: string; after: string }> | null {
  if (!Array.isArray(logs) || logs.length === 0) return null;
  const isCustomerLog = (l: NonNullable<ApplicationDetails["activityLogs"]>[number]) => {
    const md = l?.metadata;
    if (!md?.diff) return false;
    if (md?.source === "customer") return true;
    return !l?.userId;
  };
  const adminActionLog = logs.find(
    (l) => l?.action === "APPLICATION_APPROVED" || l?.action === "APPLICATION_DECLINED"
  );
  const cutoffTs = adminActionLog?.createdAt
    ? new Date(adminActionLog.createdAt).getTime()
    : 0;
  const latestCustomerLog = logs.find((l) => {
    if (!isCustomerLog(l)) return false;
    const logTs = l?.createdAt ? new Date(l.createdAt).getTime() : 0;
    return logTs > cutoffTs;
  });
  const diff = latestCustomerLog?.metadata?.diff;
  if (!diff || typeof diff !== "object") return null;
  const cleaned: Record<string, { before: string; after: string }> = {};
  for (const [key, val] of Object.entries(diff)) {
    if (!val || typeof val !== "object") continue;
    const before = String(val.before ?? "");
    const after = String(val.after ?? "");
    if (before === after) continue;
    cleaned[key] = { before, after };
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function toBaselineApplication(app: ApplicationDetails): ApplicationDetails {
  const diff = computePendingDiff(app.activityLogs);
  if (!diff) return app;
  const baseline: ApplicationDetails = { ...app };
  for (const [key, change] of Object.entries(diff)) {
    const current = (baseline as Record<string, unknown>)[key];
    if (typeof current === "boolean") {
      (baseline as Record<string, unknown>)[key] = String(change.before) === "true";
    } else {
      (baseline as Record<string, unknown>)[key] = change.before ?? "";
    }
  }
  return baseline;
}

function toEditable(app: ApplicationDetails | null): EditableApplication | null {
  if (!app) return null;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = (app as Record<string, unknown>)[k];
      if (typeof v !== "undefined" && v !== null) return v;
    }
    return "";
  };
  return {
    accountNumber: toStr(pick("account_number", "accountNumber")),
    recordNumber: toStr(pick("record_number", "recordNumber")),
    appType: toStr(pick("app_type", "appType")),
    membership: toStr(pick("membership")),
    area: toStr(pick("area")),
    district: toStr(pick("district")),
    barangay: toStr(pick("barangay")),
    firstName: toStr(pick("first_name", "firstName")),
    middleName: toStr(pick("middle_name", "middleName")),
    lastName: toStr(pick("last_name", "lastName")),
    suffixName: toStr(pick("suffix_name", "suffixName")),
    birthdate: toStr(pick("birthdate")),
    noMiddleName: Boolean(pick("no_middle_name", "noMiddleName")),
    gender: toStr(pick("gender")),
    civilStatus: toStr(pick("civil_status", "civilStatus")),
    spouseFirst: toStr(pick("spouse_first", "spouseFirst")),
    spouseMiddle: toStr(pick("spouse_middle", "spouseMiddle")),
    spouseLast: toStr(pick("spouse_last", "spouseLast")),
    spouseSuffix: toStr(pick("spouse_suffix", "spouseSuffix")),
    spouseBirthdate: toStr(pick("spouse_birthdate", "spouseBirthdate")),
    residenceAddress: toStr(pick("residence_address", "residenceAddress")),
    cellphone: toStr(pick("cellphone")),
    contactNumberForContacting: toStr(pick("contact_number_for_contacting", "contactNumberForContacting")),
    landline: toStr(pick("landline")),
    email: toStr(pick("email")),
    cosignatory: toStr(pick("cosignatory")),
    witness: toStr(pick("witness")),
    status: toStr(pick("status")),
    orNumber: toStr(pick("or_number", "orNumber")),
    dateIssued: toStr(pick("date_issued", "dateIssued")),
    notes: toStr(pick("notes")),
  };
}

export default function TicketsAdmin() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TicketStatus>("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<ApplicationDetails | null>(null);
  const [detailsSaving, setDetailsSaving] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/tickets?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data: Ticket[] = await res.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, query]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId]
  );

  const counts = useMemo(() => {
    const acc: Record<TicketStatus, number> = {
      OPEN: 0,
      IN_REVIEW: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    tickets.forEach((t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
    });
    return acc;
  }, [tickets]);

  const updateTicket = useCallback(
    async (
      id: string,
      patch: {
        status?: TicketStatus;
        resolutionNote?: string | null;
        accountNumber?: string | null;
      },
      opts: { silent?: boolean } = {}
    ): Promise<Ticket | null> => {
      setSaving(true);
      try {
        const res = await fetch(`/api/tickets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to update ticket");
        }
        const updated: Ticket = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
        if (!opts.silent) toast.success("Ticket updated");
        return updated;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Update failed";
        toast.error(msg);
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const openCustomerRecord = useCallback(
    async (ticket: Ticket) => {
      if (!ticket.accountNumber) {
        toast.error("Link an account number first.");
        return;
      }
      if (ticket.status === "OPEN") {
        await updateTicket(ticket.id, { status: "IN_REVIEW" }, { silent: true });
      }
      const authToken = (session?.user as { apiToken?: string } | undefined)?.apiToken;
      if (!authToken) {
        toast.error("Admin API token missing. Please re-login.");
        return;
      }
      setDetailsModalOpen(true);
      setDetailsLoading(true);
      setDetails(null);
      try {
        const res = await fetch(
          `/api/v1/accounts/${encodeURIComponent(ticket.accountNumber)}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || "Failed to load customer details");
        }
        const data = (await res.json()) as ApplicationDetails;
        setDetails(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load customer details");
      } finally {
        setDetailsLoading(false);
      }
    },
    [session, updateTicket]
  );

  const saveCustomerDetails = useCallback(
    async (payload: EditableApplication) => {
      if (!payload.accountNumber) {
        toast.error("Missing account number.");
        return false;
      }
      const authToken = (session?.user as { apiToken?: string } | undefined)?.apiToken;
      if (!authToken) {
        toast.error("Admin API token missing. Please re-login.");
        return false;
      }
      setDetailsSaving(true);
      try {
        const res = await fetch(
          `/api/v1/accounts/${encodeURIComponent(payload.accountNumber)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              app_type: payload.appType.toUpperCase(),
              membership: payload.membership.toUpperCase(),
              status: payload.status.toUpperCase(),
              area: payload.area,
              district: payload.district,
              barangay: payload.barangay,
              residence_address: payload.residenceAddress,
              first_name: payload.firstName,
              middle_name: payload.middleName,
              last_name: payload.lastName,
              suffix_name: payload.suffixName,
              birthdate: payload.birthdate,
              no_middle_name: payload.noMiddleName,
              gender: payload.gender.toUpperCase(),
              civil_status: payload.civilStatus,
              spouse_first: payload.spouseFirst,
              spouse_middle: payload.spouseMiddle,
              spouse_last: payload.spouseLast,
              spouse_suffix: payload.spouseSuffix,
              spouse_birthdate: payload.spouseBirthdate,
              cellphone: payload.cellphone,
              landline: payload.landline,
              email: payload.email,
              cosignatory: payload.cosignatory,
              witness: payload.witness,
              notes: payload.notes,
              or_number: payload.orNumber,
              date_issued: payload.dateIssued,
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.details || err?.error || "Failed to save customer details");
        }
        const updated = (await res.json()) as ApplicationDetails;
        setDetails(updated);
        toast.success("Customer details updated.");
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save customer details");
        return false;
      } finally {
        setDetailsSaving(false);
      }
    },
    [session]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header / summary */}
      <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">Support Tickets</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Review help requests from customers who cannot complete ID verification.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchTickets}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M4 20A8 8 0 0120 4" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"] as TicketStatus[]).map((s) => (
            <div
              key={s}
              className={`rounded-xl border px-4 py-3 ${STATUS_STYLES[s]} bg-opacity-50`}
            >
              <div className="text-xs uppercase tracking-wide">{STATUS_LABEL[s]}</div>
              <div className="mt-1 text-2xl font-semibold">{counts[s]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                statusFilter === f.value
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search name, phone, or account…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
      </div>

      {/* Two-pane layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        {/* List */}
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="max-h-[640px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-sm text-neutral-500">
                Loading tickets…
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-neutral-500">
                <svg className="h-10 w-10 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <p className="text-sm">No tickets match the current filters.</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {tickets.map((t) => {
                  const isActive = t.id === selectedId;
                  return (
                    <li
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`cursor-pointer px-4 py-3 transition ${
                        isActive
                          ? "bg-neutral-900/5"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-neutral-900">
                              {t.name}
                            </p>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[t.status]}`}
                            >
                              {STATUS_LABEL[t.status]}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-neutral-500">
                            {CATEGORY_LABEL[t.category]} · {t.phoneNumber}
                          </p>
                          {t.accountNumber && (
                            <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-500">
                              {t.accountNumber}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-[11px] text-neutral-400">
                          {formatDate(t.createdAt)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          {!selected ? (
            <div className="flex h-full min-h-[480px] flex-col items-center justify-center text-center text-neutral-500">
              <svg className="mb-3 h-12 w-12 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M8 4h8a2 2 0 012 2v14l-4-2-4 2-4-2V6a2 2 0 012-2z" />
              </svg>
              <p className="text-sm">Select a ticket to see the details.</p>
            </div>
          ) : (
            <TicketDetail
              ticket={selected}
              saving={saving}
              onUpdate={(patch) => updateTicket(selected.id, patch)}
              onLinkAccount={(accountNumber) =>
                updateTicket(selected.id, { accountNumber })
              }
              onOpenCustomer={() => openCustomerRecord(selected)}
            />
          )}
        </div>
      </div>

      {detailsModalOpen && (
        <CustomerDetailsModal
          loading={detailsLoading}
          details={details}
          saving={detailsSaving}
          onSave={saveCustomerDetails}
          onClose={() => {
            setDetailsModalOpen(false);
            setDetails(null);
          }}
        />
      )}
    </div>
  );
}

function TicketDetail({
  ticket,
  saving,
  onUpdate,
  onLinkAccount,
  onOpenCustomer,
}: {
  ticket: Ticket;
  saving: boolean;
  onUpdate: (patch: {
    status?: TicketStatus;
    resolutionNote?: string | null;
  }) => void;
  onLinkAccount: (accountNumber: string) => Promise<Ticket | null>;
  onOpenCustomer: () => void;
}) {
  const [note, setNote] = useState(ticket.resolutionNote ?? "");

  useEffect(() => {
    setNote(ticket.resolutionNote ?? "");
  }, [ticket.id, ticket.resolutionNote]);

  const isImage =
    ticket.attachmentUrl &&
    /\.(png|jpg|jpeg|webp|gif)$/i.test(ticket.attachmentUrl);

  const phoneHref = `tel:${ticket.phoneNumber.replace(/\s+/g, "")}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-xl font-semibold text-neutral-900">{ticket.name}</h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Opened {formatDate(ticket.createdAt)}
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>
      </div>

      {/* Quick actions: open customer record / link an account */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-blue-900">
          Action customer record
        </div>
        {ticket.accountNumber ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-neutral-700">
              Linked to account{" "}
              <span className="font-mono font-semibold text-neutral-900">
                {ticket.accountNumber}
              </span>
              .
            </p>
            <button
              type="button"
              onClick={onOpenCustomer}
              disabled={saving}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#3D45AA] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#2F367F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              View Customer Details
            </button>
          </div>
        ) : (
          <ApplicationLookup
            ticketName={ticket.name}
            ticketPhone={ticket.phoneNumber}
            saving={saving}
            onLink={onLinkAccount}
          />
        )}
      </div>

      {/* Core info */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <InfoRow label="Category" value={CATEGORY_LABEL[ticket.category]} />
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Phone
          </dt>
          <dd className="mt-0.5 font-mono text-sm text-neutral-900">
            <a className="hover:underline" href={phoneHref}>
              {ticket.phoneNumber}
            </a>
          </dd>
        </div>
        <InfoRow label="Address" value={ticket.address} fullSpan />
        <InfoRow label="Location / Landmark" value={ticket.location || "—"} />
        <InfoRow
          label="Account #"
          value={ticket.accountNumber || "—"}
          mono
        />
        <InfoRow
          label="Last updated"
          value={formatDate(ticket.updatedAt)}
          fullSpan
        />
        {ticket.resolvedAt && (
          <InfoRow
            label="Resolved at"
            value={`${formatDate(ticket.resolvedAt)}${
              ticket.resolvedBy
                ? ` · by ${ticket.resolvedBy.name || ticket.resolvedBy.username}`
                : ""
            }`}
            fullSpan
          />
        )}
      </dl>

      {ticket.message && (
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Customer&apos;s note
          </div>
          <p className="mt-1 whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
            {ticket.message}
          </p>
        </div>
      )}

      {ticket.attachmentUrl && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Attachment
            </div>
            <a
              href={ticket.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Open in new tab
            </a>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ticket.attachmentUrl}
                alt={ticket.attachmentName || "Ticket attachment"}
                className="max-h-96 w-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-between p-4 text-sm text-neutral-700">
                <span>{ticket.attachmentName || "Attached file"}</span>
                <a
                  href={ticket.attachmentUrl}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                  target="_blank"
                  rel="noreferrer"
                >
                  View file
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-neutral-200 pt-4">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Admin actions
        </div>

        <label className="mt-2 block text-sm text-neutral-800">
          Resolution note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What action did you take? (optional)"
            className="mt-1 w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="mr-2 text-xs text-neutral-500">Change status:</div>
          {(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"] as TicketStatus[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                disabled={saving || ticket.status === s}
                onClick={() => onUpdate({ status: s, resolutionNote: note })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  ticket.status === s
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            )
          )}
          <button
            type="button"
            disabled={saving || (note || "") === (ticket.resolutionNote || "")}
            onClick={() => onUpdate({ resolutionNote: note })}
            className="ml-auto rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save note
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtValue(value: unknown): string {
  if (value === null || typeof value === "undefined" || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map((v) => String(v)).join(", ") : "—";
  return String(value);
}

function CustomerDetailsModal({
  loading,
  details,
  saving,
  onSave,
  onClose,
}: {
  loading: boolean;
  details: ApplicationDetails | null;
  saving: boolean;
  onSave: (payload: EditableApplication) => Promise<boolean>;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditableApplication | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setForm(toEditable(details));
    setIsEditing(false);
  }, [details]);

  const setField = <K extends keyof EditableApplication>(key: K, value: EditableApplication[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const readOnlyInput =
    "mt-1 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900";
  const editInput =
    "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10";

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-y-0 right-0 left-0 bg-black/35 backdrop-blur-md md:left-56"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6 md:pl-64">
        <div
          className="w-full max-w-4xl rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl ring-1 ring-black/10 max-h-[calc(100vh-2rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-neutral-200 pb-3">
            <h3 className="text-lg font-semibold text-neutral-900">Customer Details</h3>
            <div className="flex items-center gap-2">
              {form && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg bg-[#3D45AA] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2F367F]"
                >
                  Edit
                </button>
              )}
              {form && isEditing && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      if (!form) return;
                      const ok = await onSave(form);
                      if (ok) setIsEditing(false);
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setForm(toEditable(details));
                      setIsEditing(false);
                    }}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-neutral-500">
              Loading customer details...
            </div>
          ) : !form ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-neutral-500">
              No customer details available.
            </div>
          ) : (
            <div className="max-h-[calc(100vh-9rem)] space-y-5 overflow-y-auto pr-1">
              <section>
                <h4 className="mb-2 text-center text-base font-semibold text-neutral-900">Your information</h4>
                <p className="mb-3 text-center text-xs text-neutral-500">
                  Carefully review your data before submitting. You can edit fields as needed.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Account</label>
                    <input value={form.accountNumber} disabled className={readOnlyInput} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Application Type</label>
                    <input
                      value={form.appType}
                      onChange={(e) => setField("appType", e.target.value)}
                      disabled={!isEditing}
                      className={isEditing ? editInput : readOnlyInput}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Membership Type</label>
                    <input
                      value={form.membership}
                      onChange={(e) => setField("membership", e.target.value)}
                      disabled={!isEditing}
                      className={isEditing ? editInput : readOnlyInput}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Area</label>
                    <input value={form.area} onChange={(e) => setField("area", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">District</label>
                    <input value={form.district} onChange={(e) => setField("district", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Barangay</label>
                    <input value={form.barangay} onChange={(e) => setField("barangay", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">First Name</label>
                  <input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Middle Name</label>
                  <input value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} disabled={!isEditing || form.noMiddleName} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Last Name</label>
                  <input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Suffix</label>
                  <input value={form.suffixName} onChange={(e) => setField("suffixName", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Birthdate</label>
                  <input value={form.birthdate} onChange={(e) => setField("birthdate", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Gender</label>
                  <input value={form.gender} onChange={(e) => setField("gender", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Civil Status</label>
                  <input value={form.civilStatus} onChange={(e) => setField("civilStatus", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Spouse First</label>
                  <input value={form.spouseFirst} onChange={(e) => setField("spouseFirst", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Spouse Middle</label>
                  <input value={form.spouseMiddle} onChange={(e) => setField("spouseMiddle", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Spouse Last</label>
                  <input value={form.spouseLast} onChange={(e) => setField("spouseLast", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Spouse Birthdate</label>
                  <input value={form.spouseBirthdate} onChange={(e) => setField("spouseBirthdate", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Residence Address</label>
                  <input value={form.residenceAddress} onChange={(e) => setField("residenceAddress", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Cellphone</label>
                  <input value={form.cellphone} onChange={(e) => setField("cellphone", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Landline</label>
                  <input value={form.landline} onChange={(e) => setField("landline", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Email</label>
                  <input value={form.email} onChange={(e) => setField("email", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Co-signatory</label>
                  <input value={form.cosignatory} onChange={(e) => setField("cosignatory", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Witness</label>
                  <input value={form.witness} onChange={(e) => setField("witness", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Status</label>
                  <input value={form.status} onChange={(e) => setField("status", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">OR Number</label>
                  <input value={form.orNumber} onChange={(e) => setField("orNumber", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Date Issued</label>
                  <input value={form.dateIssued} onChange={(e) => setField("dateIssued", e.target.value)} disabled={!isEditing} className={isEditing ? editInput : readOnlyInput} />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                    className={isEditing ? `${editInput} resize-none` : `${readOnlyInput} resize-none`}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function InfoRow({
  label,
  value,
  mono,
  fullSpan,
}: {
  label: string;
  value: string;
  mono?: boolean;
  fullSpan?: boolean;
}) {
  return (
    <div className={fullSpan ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm text-neutral-900 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

type LookupApplication = {
  id: string;
  accountNumber: string | null;
  recordNumber: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  cellphone: string | null;
  landline: string | null;
  contactNumberForContacting: string | null;
  area: string | null;
  barangay: string | null;
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function ApplicationLookup({
  ticketName,
  ticketPhone,
  saving,
  onLink,
}: {
  ticketName: string;
  ticketPhone: string;
  saving: boolean;
  onLink: (accountNumber: string) => Promise<unknown>;
}) {
  const [allApps, setAllApps] = useState<LookupApplication[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(ticketName);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    setQuery(ticketName);
  }, [ticketName]);

  const ensureLoaded = useCallback(async () => {
    if (allApps !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/applications`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load applications");
      const data = (await res.json()) as LookupApplication[];
      setAllApps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load customer list");
      setAllApps([]);
    } finally {
      setLoading(false);
    }
  }, [allApps]);

  const matches = useMemo(() => {
    if (!allApps) return [];
    const qName = normalize(query);
    const qDigits = digitsOnly(query);
    if (!qName && !qDigits) return [];
    return allApps
      .filter((a) => a.accountNumber)
      .filter((a) => {
        const fullName = normalize(
          [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ")
        );
        if (qName && fullName.includes(qName)) return true;
        if (qDigits) {
          const phones = [
            a.cellphone,
            a.landline,
            a.contactNumberForContacting,
            a.accountNumber,
          ]
            .filter(Boolean)
            .map((p) => digitsOnly(String(p)));
          if (phones.some((p) => p.includes(qDigits))) return true;
        }
        return false;
      })
      .slice(0, 8);
  }, [allApps, query]);

  // Auto-suggest by ticket phone digits as well
  const phoneDigits = useMemo(() => digitsOnly(ticketPhone), [ticketPhone]);
  const phoneMatches = useMemo(() => {
    if (!allApps || phoneDigits.length < 6) return [];
    return allApps
      .filter((a) => a.accountNumber)
      .filter((a) =>
        [a.cellphone, a.landline, a.contactNumberForContacting]
          .filter(Boolean)
          .some((p) => digitsOnly(String(p)).includes(phoneDigits))
      )
      .slice(0, 5);
  }, [allApps, phoneDigits]);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="text-sm text-neutral-700">
        No account number on this ticket. Find the customer&apos;s record to edit.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => void ensureLoaded()}
          placeholder="Search by name or phone…"
          className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
        <button
          type="button"
          onClick={() => void ensureLoaded()}
          disabled={loading}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading…" : allApps ? "Refresh" : "Load list"}
        </button>
      </div>

      {phoneMatches.length > 0 && query === ticketName && (
        <p className="text-[11px] text-neutral-500">
          Suggestions based on the ticket phone number:
        </p>
      )}

      {(matches.length > 0 || phoneMatches.length > 0) && (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {(matches.length > 0 ? matches : phoneMatches).map((a) => {
            const display =
              [a.firstName, a.middleName, a.lastName]
                .filter(Boolean)
                .join(" ") || "(unnamed)";
            const where = [a.area, a.barangay].filter(Boolean).join(", ");
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {display}
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">
                    <span className="font-mono">{a.accountNumber}</span>
                    {where ? ` · ${where}` : ""}
                    {a.cellphone ? ` · ${a.cellphone}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving || linking === a.id}
                  onClick={async () => {
                    if (!a.accountNumber) return;
                    setLinking(a.id);
                    await onLink(a.accountNumber);
                    setLinking(null);
                  }}
                  className="shrink-0 rounded-lg border border-[#3D45AA] bg-white px-3 py-1 text-xs font-medium text-[#3D45AA] shadow-sm hover:bg-[#3D45AA] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {linking === a.id ? "Linking…" : "Link to ticket"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {allApps !== null && matches.length === 0 && phoneMatches.length === 0 && (
        <p className="text-xs text-neutral-500">
          No matching applications found.
        </p>
      )}
    </div>
  );
}

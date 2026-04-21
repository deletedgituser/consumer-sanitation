"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function TicketsAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TicketStatus>("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const updateTicket = async (
    id: string,
    patch: { status?: TicketStatus; resolutionNote?: string | null }
  ) => {
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
      toast.success("Ticket updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

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
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TicketDetail({
  ticket,
  saving,
  onUpdate,
}: {
  ticket: Ticket;
  saving: boolean;
  onUpdate: (patch: {
    status?: TicketStatus;
    resolutionNote?: string | null;
  }) => void;
}) {
  const [note, setNote] = useState(ticket.resolutionNote ?? "");

  useEffect(() => {
    setNote(ticket.resolutionNote ?? "");
  }, [ticket.id, ticket.resolutionNote]);

  const isImage =
    ticket.attachmentUrl &&
    /\.(png|jpg|jpeg|webp|gif)$/i.test(ticket.attachmentUrl);

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

      {/* Core info */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <InfoRow label="Category" value={CATEGORY_LABEL[ticket.category]} />
        <InfoRow label="Phone" value={ticket.phoneNumber} mono />
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

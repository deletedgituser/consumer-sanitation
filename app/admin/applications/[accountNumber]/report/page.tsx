"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "./report.css";

// ─────────────────────────────────────────────────────────────
// Types (minimal, matched to the /report endpoint response)
// ─────────────────────────────────────────────────────────────

type UserRef = {
  id?: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
} | null;

type ActivityLog = {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  user?: UserRef;
  metadata?: any;
};

type Notification = {
  id: string;
  type: "INFO" | "APPROVED" | "DECLINED" | "PENDING";
  message: string;
  read: boolean;
  createdAt: string;
};

type Application = {
  id: string;
  accountNumber: string | null;
  recordNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;

  appType: string;
  membership: string;
  area: string | null;
  district: string | null;
  barangay: string | null;
  residenceAddress: string | null;

  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffixName: string | null;
  noMiddleName: boolean;
  birthdate: string | null;
  gender: string | null;
  civilStatus: string | null;

  spouseFirst: string | null;
  spouseMiddle: string | null;
  spouseLast: string | null;
  spouseSuffix: string | null;
  spouseBirthdate: string | null;

  cellphone: string | null;
  landline: string | null;
  email: string | null;
  contactNumberForContacting?: string | null;

  privacyConsent: boolean;
  privacyNewsletter: boolean;
  privacyEmail: boolean;
  privacySms: boolean;
  privacyPhone: boolean;
  privacySocial: boolean;

  cosignatory: string | null;
  witness: string | null;
  notes: string | null;
  orNumber: string | null;
  dateIssued: string | null;

  customerUpdateReason?: string | null;

  createdBy?: UserRef;
  updatedBy?: UserRef;
};

type ReportBundle = {
  application: Application;
  logs: ActivityLog[];
  notifications: Notification[];
  generatedAt: string;
  generatedBy: { id: string | null; name: string | null; email: string | null };
};

// ─────────────────────────────────────────────────────────────
// Field label map — used by the diff table
// ─────────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  appType: "Application Type",
  membership: "Membership Type",
  area: "Area",
  district: "District",
  barangay: "Barangay",
  residenceAddress: "Residence Address",
  firstName: "First Name",
  middleName: "Middle Name",
  lastName: "Last Name",
  suffixName: "Suffix Name",
  noMiddleName: "No Middle Name",
  birthdate: "Birthdate",
  gender: "Gender",
  civilStatus: "Civil Status",
  spouseFirst: "Spouse First Name",
  spouseMiddle: "Spouse Middle Name",
  spouseLast: "Spouse Last Name",
  spouseSuffix: "Spouse Suffix",
  spouseBirthdate: "Spouse Birthdate",
  cellphone: "Cellphone No.",
  landline: "Landline No.",
  email: "E-mail Address",
  contactNumberForContacting: "Contact number (for contacting)",
  cosignatory: "Co-signatory",
  witness: "Witness",
  notes: "Notes",
  privacyConsent: "Privacy Consent",
  privacyNewsletter: "Newsletter Opt-in",
  privacyEmail: "Email Opt-in",
  privacySms: "SMS Opt-in",
  privacyPhone: "Phone Opt-in",
  privacySocial: "Social Opt-in",
  customerUpdateReason: "Update Reason",
};

const labelFor = (key: string) => FIELD_LABELS[key] ?? key;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const normalizeStatus = (s?: string) => (s ?? "").toUpperCase();

const statusMeta = (s: string) => {
  const n = normalizeStatus(s);
  if (n === "APPROVED" || n === "SIGNED_UP") {
    return { label: "APPROVED", color: "#16A34A", bg: "#DCFCE7" };
  }
  if (n === "DECLINED") {
    return { label: "DECLINED", color: "#DC2626", bg: "#FEE2E2" };
  }
  if (n === "PENDING") {
    return { label: "PENDING", color: "#C2410C", bg: "#FFEDD5" };
  }
  return { label: n || "UNKNOWN", color: "#475569", bg: "#E2E8F0" };
};

const actorOf = (log: ActivityLog) => {
  if (log.user?.name) return log.user.name;
  if (log.user?.username) return log.user.username;
  if (log.userEmail) return log.userEmail;
  if (log?.metadata?.source === "customer") return "Customer";
  return "System";
};

const eventTitle = (log: ActivityLog) => {
  const md = log.metadata ?? {};
  switch (log.action) {
    case "APPLICATION_CREATED":
      return "Application created";
    case "APPLICATION_APPROVED":
      return "Application approved";
    case "APPLICATION_DECLINED":
      return "Application declined";
    case "APPLICATION_UPDATED": {
      const isCustomer = md?.source === "customer" || !log.userId;
      const count = md?.diff ? Object.keys(md.diff).length : 0;
      if (isCustomer) {
        return count
          ? `Customer submitted updates (${count} field${count === 1 ? "" : "s"})`
          : "Customer submitted updates";
      }
      return "Admin updated application";
    }
    case "APPLICATION_DELETED":
      return "Application deleted";
    case "STATUS_CHANGED":
      return "Status changed";
    case "DOCUMENT_UPLOADED":
      return "Document uploaded";
    case "DOCUMENT_DELETED":
      return "Document deleted";
    default:
      return log.action.replace(/^APPLICATION_/, "").replace(/_/g, " ").toLowerCase();
  }
};

const eventColor = (log: ActivityLog) => {
  const md = log.metadata ?? {};
  switch (log.action) {
    case "APPLICATION_CREATED":
      return "#3D45AA";
    case "APPLICATION_APPROVED":
      return "#16A34A";
    case "APPLICATION_DECLINED":
      return "#DC2626";
    case "APPLICATION_UPDATED":
      return md?.source === "customer" || !log.userId ? "#F8843F" : "#3D45AA";
    default:
      return "#64748B";
  }
};

const nonEmpty = (s?: string | null) =>
  typeof s === "string" && s.trim().length > 0 ? s : null;

const fullName = (a: Application) =>
  [a.firstName, a.middleName, a.lastName, a.suffixName ? a.suffixName : null]
    .map((p) => (p ? p.trim() : ""))
    .filter((p) => p.length > 0)
    .join(" ") || "—";

const spouseName = (a: Application) =>
  [a.spouseFirst, a.spouseMiddle, a.spouseLast, a.spouseSuffix ? a.spouseSuffix : null]
    .map((p) => (p ? p.trim() : ""))
    .filter((p) => p.length > 0)
    .join(" ");

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function ApplicationReportPage() {
  const params = useParams<{ accountNumber: string }>();
  const router = useRouter();
  const accountNumber = params?.accountNumber ?? "";

  const [data, setData] = useState<ReportBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/applications/${encodeURIComponent(accountNumber)}/report`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || `Failed to load report (${res.status})`);
        }
        const json = (await res.json()) as ReportBundle;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (accountNumber) void load();
    return () => {
      cancelled = true;
    };
  }, [accountNumber]);

  const app = data?.application ?? null;
  const status = useMemo(() => (app ? statusMeta(app.status) : null), [app]);

  // Customer-origin update logs (for Change History section)
  const customerDiffLogs = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs
      .filter((l) => l.action === "APPLICATION_UPDATED")
      .filter((l) => {
        const md = l.metadata ?? {};
        const isCustomer = md?.source === "customer" || !l.userId;
        return isCustomer && md?.diff && typeof md.diff === "object" && Object.keys(md.diff).length > 0;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data]);

  // Admin decisions (approvals/declines) for Admin Actions section
  const adminDecisions = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs
      .filter((l) => l.action === "APPLICATION_APPROVED" || l.action === "APPLICATION_DECLINED")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data]);

  // Timeline events: CREATED + customer/admin UPDATED + APPROVED/DECLINED
  const timeline = useMemo(() => {
    if (!data?.logs) return [];
    const whitelist = new Set([
      "APPLICATION_CREATED",
      "APPLICATION_UPDATED",
      "APPLICATION_APPROVED",
      "APPLICATION_DECLINED",
    ]);
    return data.logs
      .filter((l) => whitelist.has(l.action))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data]);

  if (loading) {
    return (
      <div className="report-viewport">
        <div className="report-loading">Loading report…</div>
      </div>
    );
  }

  if (error || !app || !status) {
    return (
      <div className="report-viewport">
        <div className="report-loading">
          <p>Could not load report.</p>
          {error && <p className="report-error">{error}</p>}
          <button className="report-btn" onClick={() => router.back()}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-viewport">
      {/* ── Toolbar ── (hidden on print) */}
      <div className="report-toolbar print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="report-btn report-btn-ghost"
        >
          ← Back
        </button>
        <div className="report-toolbar-title">Application Report</div>
        <div className="report-toolbar-actions">
          <button
            type="button"
            onClick={() => window.print()}
            className="report-btn report-btn-primary"
          >
            Download PDF / Print
          </button>
        </div>
      </div>

      {/* ── A4 paper ── */}
      <article className="report-paper" aria-label="Application Detailed Report">
        {/* Running header strip (only visible in print via CSS) */}
        <div className="report-header-strip">
          ANECO SANITATION · APPLICATION DETAILED REPORT
        </div>

        {/* ─── HEADER CARD ─── */}
        <header className="report-section report-header-card">
          <div className="report-header-top">
            <div>
              <h1 className="report-title">Application Detailed Report</h1>
              <div className="report-kv">
                <span className="report-kv-k">Account #</span>
                <span className="report-kv-v report-mono">
                  {app.accountNumber ?? "—"}
                </span>
              </div>
              <div className="report-kv">
                <span className="report-kv-k">Record #</span>
                <span className="report-kv-v report-mono">{app.recordNumber}</span>
              </div>
            </div>
            <div
              className="report-status-badge"
              style={{ color: status.color, background: status.bg }}
            >
              ● {status.label}
            </div>
          </div>
          <div className="report-header-footer">
            Generated on {fmtDateTime(data?.generatedAt)}
            {data?.generatedBy?.name ? (
              <>
                {" "}
                · by <strong>{data.generatedBy.name}</strong>
                {data.generatedBy.email ? ` (${data.generatedBy.email})` : ""}
              </>
            ) : null}
          </div>
        </header>

        {/* ─── SECTION 1: CUSTOMER INFORMATION ─── */}
        <section className="report-section">
          <h2 className="report-section-title">1. Customer Information</h2>
          <div className="report-grid-2">
            <div className="report-field">
              <div className="report-label">Full Name</div>
              <div className="report-value">{fullName(app)}</div>
            </div>
            <div className="report-field">
              <div className="report-label">Address</div>
              <div className="report-value">
                {[app.residenceAddress, app.barangay, app.district, app.area]
                  .map((p) => (p ? p.trim() : ""))
                  .filter(Boolean)
                  .join(", ") || "—"}
              </div>
            </div>
            <div className="report-field">
              <div className="report-label">Account Number</div>
              <div className="report-value report-mono">
                {app.accountNumber ?? "—"}
              </div>
            </div>
            <div className="report-field">
              <div className="report-label">Contact</div>
              <div className="report-value">
                {nonEmpty(app.cellphone) && (
                  <div>
                    <span className="report-muted">Mobile · </span>
                    {app.cellphone}
                  </div>
                )}
                {nonEmpty(app.landline) && (
                  <div>
                    <span className="report-muted">Landline · </span>
                    {app.landline}
                  </div>
                )}
                {nonEmpty(app.email) && (
                  <div>
                    <span className="report-muted">Email · </span>
                    {app.email}
                  </div>
                )}
                {!nonEmpty(app.cellphone) &&
                  !nonEmpty(app.landline) &&
                  !nonEmpty(app.email) &&
                  "—"}
              </div>
            </div>
            <div className="report-field">
              <div className="report-label">Record Number</div>
              <div className="report-value report-mono">{app.recordNumber}</div>
            </div>
            <div className="report-field">
              <div className="report-label">Birthdate · Gender · Civil Status</div>
              <div className="report-value">
                {fmtDate(app.birthdate)} ·{" "}
                <span className="report-capitalize">
                  {app.gender?.toLowerCase() || "—"}
                </span>{" "}
                ·{" "}
                <span className="report-capitalize">
                  {app.civilStatus || "—"}
                </span>
              </div>
            </div>
            <div className="report-field">
              <div className="report-label">Application Type</div>
              <div className="report-value report-capitalize">
                {app.appType === "new" ? "As New Member" : "As Change / New Occupant"}
                {" · "}
                {app.membership === "household"
                  ? "Household"
                  : "Corporate / Sectoral / Business"}
              </div>
            </div>
            {spouseName(app) ? (
              <div className="report-field">
                <div className="report-label">Spouse</div>
                <div className="report-value">
                  {spouseName(app)}
                  {app.spouseBirthdate ? ` · ${fmtDate(app.spouseBirthdate)}` : ""}
                </div>
              </div>
            ) : null}
            <div className="report-field report-col-span-2">
              <div className="report-label">Privacy Consent</div>
              <div className="report-value">
                {app.privacyConsent
                  ? `Granted · ${[
                      app.privacyNewsletter && "Newsletter",
                      app.privacyEmail && "Email",
                      app.privacySms && "SMS",
                      app.privacyPhone && "Phone",
                      app.privacySocial && "Social",
                    ]
                      .filter(Boolean)
                      .join(", ") || "No channels selected"}`
                  : "Not granted"}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: APPLICATION SUMMARY ─── */}
        <section className="report-section">
          <h2 className="report-section-title">2. Application Summary</h2>
          <div className="report-tiles">
            <div className="report-tile">
              <div className="report-tile-label">Status</div>
              <div
                className="report-tile-value"
                style={{ color: status.color }}
              >
                ● {status.label}
              </div>
            </div>
            <div className="report-tile">
              <div className="report-tile-label">Created</div>
              <div className="report-tile-value">{fmtDateTime(app.createdAt)}</div>
            </div>
            <div className="report-tile">
              <div className="report-tile-label">Last Updated</div>
              <div className="report-tile-value">{fmtDateTime(app.updatedAt)}</div>
            </div>
            <div className="report-tile">
              <div className="report-tile-label">
                {normalizeStatus(app.status) === "APPROVED" ||
                normalizeStatus(app.status) === "SIGNED_UP"
                  ? "Approved On"
                  : normalizeStatus(app.status) === "DECLINED"
                    ? "Declined On"
                    : "Pending Since"}
              </div>
              <div className="report-tile-value">
                {normalizeStatus(app.status) === "APPROVED" ||
                normalizeStatus(app.status) === "SIGNED_UP"
                  ? fmtDateTime(app.approvedAt ?? null)
                  : normalizeStatus(app.status) === "DECLINED"
                    ? fmtDateTime(app.declinedAt ?? null)
                    : fmtDateTime(app.updatedAt ?? app.createdAt)}
              </div>
            </div>
          </div>
          {app.customerUpdateReason ? (
            <div className="report-callout">
              <span className="report-muted">Customer update reason: </span>
              <strong className="report-capitalize">
                {app.customerUpdateReason.replace(/_/g, " ")}
              </strong>
            </div>
          ) : null}
        </section>

        {/* ─── SECTION 3: TIMELINE ─── */}
        <section className="report-section">
          <h2 className="report-section-title">3. Timeline</h2>
          {timeline.length === 0 ? (
            <p className="report-muted">No events logged yet.</p>
          ) : (
            <ol className="report-timeline">
              {timeline.map((log) => (
                <li key={log.id} className="report-timeline-item">
                  <span
                    className="report-timeline-dot"
                    style={{ background: eventColor(log) }}
                    aria-hidden
                  />
                  <div className="report-timeline-content">
                    <div className="report-timeline-head">
                      <span className="report-timeline-date">
                        {fmtDateTime(log.createdAt)}
                      </span>
                      <span
                        className="report-timeline-title"
                        style={{ color: eventColor(log) }}
                      >
                        {eventTitle(log)}
                      </span>
                    </div>
                    <div className="report-timeline-meta">
                      <span className="report-muted">Actor:</span>{" "}
                      <strong>{actorOf(log)}</strong>
                      {log.description ? (
                        <>
                          {" "}
                          · <span>{log.description}</span>
                        </>
                      ) : null}
                      {log?.metadata?.customerUpdateReason ? (
                        <>
                          {" · "}
                          <span className="report-capitalize">
                            Reason: {String(log.metadata.customerUpdateReason).replace(/_/g, " ")}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ─── SECTION 4: CHANGE HISTORY ─── */}
        <section className="report-section report-avoid-break">
          <h2 className="report-section-title">4. Change History</h2>
          {customerDiffLogs.length === 0 ? (
            <p className="report-muted">No customer-submitted changes recorded.</p>
          ) : (
            <div className="report-diff-groups">
              {customerDiffLogs.map((log, idx) => {
                const diff = log.metadata?.diff ?? {};
                const entries = Object.entries(diff) as [
                  string,
                  { before?: string; after?: string },
                ][];
                return (
                  <div key={log.id} className="report-diff-group">
                    <div className="report-diff-header">
                      <span className="report-diff-badge">
                        Group {idx + 1}
                      </span>
                      <span>{fmtDateTime(log.createdAt)}</span>
                      <span className="report-muted">·</span>
                      <span>
                        {actorOf(log) === "System" ? "Customer submitted" : `${actorOf(log)} submitted`}
                      </span>
                      {log.metadata?.customerUpdateReason ? (
                        <>
                          <span className="report-muted">·</span>
                          <span className="report-capitalize">
                            {String(log.metadata.customerUpdateReason).replace(/_/g, " ")}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Before</th>
                          <th>After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map(([field, change]) => (
                          <tr key={field}>
                            <td className="report-td-label">{labelFor(field)}</td>
                            <td className="report-td-before">
                              {nonEmpty(change?.before ?? null) ?? "—"}
                            </td>
                            <td className="report-td-after">
                              {nonEmpty(change?.after ?? null) ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── SECTION 5: ADMIN ACTIONS ─── */}
        <section className="report-section">
          <h2 className="report-section-title">5. Admin Actions</h2>
          {adminDecisions.length === 0 ? (
            <p className="report-muted">No admin decision recorded yet.</p>
          ) : (
            <div className="report-action-list">
              {adminDecisions.map((log) => {
                const md = log.metadata ?? {};
                const isApproved = log.action === "APPLICATION_APPROVED";
                const color = isApproved ? "#16A34A" : "#DC2626";
                const from = md?.previousStatus ?? "PENDING";
                const to = md?.newStatus ?? (isApproved ? "APPROVED" : "DECLINED");
                return (
                  <div key={log.id} className="report-action-card">
                    <div className="report-action-head">
                      <span
                        className="report-action-title"
                        style={{ color }}
                      >
                        ● {isApproved ? "APPROVED" : "DECLINED"}
                      </span>
                      <span className="report-muted">
                        {fmtDateTime(log.createdAt)}
                      </span>
                    </div>
                    <div className="report-action-row">
                      <span className="report-muted">Status transition:</span>{" "}
                      <strong>{String(from).toUpperCase()}</strong>{" "}
                      <span aria-hidden>──▶</span>{" "}
                      <strong style={{ color }}>
                        {String(to).toUpperCase()}
                      </strong>
                    </div>
                    <div className="report-action-row">
                      <span className="report-muted">Reviewed by:</span>{" "}
                      <strong>{actorOf(log)}</strong>
                      {log.user?.email ? (
                        <span className="report-muted"> ({log.user.email})</span>
                      ) : null}
                    </div>
                    {!isApproved && nonEmpty(app.declineReason) ? (
                      <div className="report-action-row">
                        <span className="report-muted">Decline reason:</span>{" "}
                        <em>&ldquo;{app.declineReason}&rdquo;</em>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── SECTION 6: NOTIFICATIONS ─── */}
        <section className="report-section">
          <h2 className="report-section-title">6. Notifications</h2>
          {(!data?.notifications || data.notifications.length === 0) ? (
            <p className="report-muted">No customer-visible notifications yet.</p>
          ) : (
            <ul className="report-notif-list">
              {data.notifications.map((n) => {
                const meta = statusMeta(n.type);
                return (
                  <li key={n.id} className="report-notif">
                    <span
                      className="report-notif-pill"
                      style={{ color: meta.color, background: meta.bg }}
                    >
                      {n.type}
                    </span>
                    <div className="report-notif-body">
                      <p className="report-notif-msg">{n.message}</p>
                      <p className="report-notif-time">
                        {fmtDateTime(n.createdAt)}
                        <span className="report-muted">
                          {" · "}
                          {n.read ? "read" : "unread"}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="report-footer">
          ANECO Sanitation · Generated by{" "}
          {data?.generatedBy?.name ?? "—"} ·{" "}
          Account {app.accountNumber ?? "—"}
        </footer>
      </article>
    </div>
  );
}

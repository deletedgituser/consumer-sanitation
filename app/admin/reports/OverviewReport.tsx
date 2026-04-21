"use client";

import { useEffect, useMemo, useState } from "react";
// Reuse only the toolbar / loading / print @page rules from the shared report.css.
import "../applications/[accountNumber]/report/report.css";
import "./overview.css";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Totals = {
  all: number;
  pending: number;
  approved: number;
  declined: number;
  decided: number;
  approvalRate: number;
};

type Timing = {
  avgProcessingDays: number | null;
  medianProcessingDays: number | null;
  sampleSize: number;
};

type SeriesRow = {
  key: string;
  label: string;
  start: string;
  end: string;
  pending: number;
  approved: number;
  declined: number;
};

type Bucket = "day" | "week" | "month";

type UpdateReasonRow = {
  reason: string;
  total: number;
  pending: number;
  approved: number;
  declined: number;
  approvalRate: number;
};

type DeclineRow = { reason: string; count: number; percent: number };
type FieldRow = { field: string; count: number };

type RecentActivity = {
  id: string;
  action: string;
  createdAt: string;
  description: string | null;
  actor: string;
  accountNumber: string | null;
  recordNumber: string | null;
  fieldCount: number;
};

type Overview = {
  generatedAt: string;
  generatedBy: { id: string | null; name: string | null; email: string | null };
  range: { bucket: Bucket; from: string; to: string };
  totals: Totals;
  timing: Timing;
  series: SeriesRow[];
  updateReasons: UpdateReasonRow[];
  declineReasons: DeclineRow[];
  topEditedFields: FieldRow[];
  recentActivity: RecentActivity[];
};

// ─────────────────────────────────────────────────────────────
// Label maps + helpers
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
  suffixName: "Suffix",
  noMiddleName: "No Middle Name",
  birthdate: "Birthdate",
  gender: "Gender",
  civilStatus: "Civil Status",
  spouseFirst: "Spouse First",
  spouseMiddle: "Spouse Middle",
  spouseLast: "Spouse Last",
  spouseSuffix: "Spouse Suffix",
  spouseBirthdate: "Spouse Birthdate",
  cellphone: "Cellphone",
  landline: "Landline",
  email: "Email",
  contactNumberForContacting: "Contact no. (for contacting)",
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
const labelFor = (k: string) => FIELD_LABELS[k] ?? k;

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

const fmtPercent = (n: number, digits = 1) =>
  Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "—";

const fmtNumber = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "—"
    : n.toFixed(digits).replace(/\.0$/, "");

const prettifyReason = (r: string) =>
  r === "(no reason)"
    ? "No reason provided"
    : r.replace(/_/g, " ").replace(/\s+/g, " ").trim();

const actionLabel = (a: string) => {
  switch (a) {
    case "APPLICATION_CREATED":
      return "Created";
    case "APPLICATION_UPDATED":
      return "Updated";
    case "APPLICATION_APPROVED":
      return "Approved";
    case "APPLICATION_DECLINED":
      return "Declined";
    default:
      return a.replace(/^APPLICATION_/, "").replace(/_/g, " ").toLowerCase();
  }
};

const actionColor = (a: string) => {
  switch (a) {
    case "APPLICATION_CREATED":
      return "#6366F1";
    case "APPLICATION_UPDATED":
      return "#F59E0B";
    case "APPLICATION_APPROVED":
      return "#10B981";
    case "APPLICATION_DECLINED":
      return "#EF4444";
    default:
      return "#64748B";
  }
};

// ─────────────────────────────────────────────────────────────
// Donut ring (SVG)
// ─────────────────────────────────────────────────────────────
function DonutRing({
  percent,
  color,
  track = "#EEF2F7",
  size = 128,
  stroke = 10,
  value,
  valueColor = "#0F172A",
  caption,
}: {
  percent: number;
  color: string;
  track?: string;
  size?: number;
  stroke?: number;
  value: string | number;
  valueColor?: string;
  caption?: string;
}) {
  const r = 50 - stroke / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, percent));
  const offset = circ * (1 - clamped);

  return (
    <div className="dash-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="dash-ring-svg" aria-hidden>
        <circle cx="50" cy="50" r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="dash-ring-center">
        <div className="dash-ring-value" style={{ color: valueColor }}>
          {value}
        </div>
        {caption ? <div className="dash-ring-caption">{caption}</div> : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Smooth area chart (SVG)
// ─────────────────────────────────────────────────────────────
function AreaChart({
  series,
  color,
  width = 520,
  height = 160,
  padding = 24,
}: {
  series: { label: string; value: number }[];
  color: string;
  width?: number;
  height?: number;
  padding?: number;
}) {
  if (series.length === 0) {
    return <div className="dash-area-empty">No data</div>;
  }
  const max = Math.max(1, ...series.map((s) => s.value));
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = series.map((s, i) => {
    const x = padding + (innerW * i) / Math.max(1, series.length - 1);
    const y = padding + innerH - (s.value / max) * innerH;
    return { x, y };
  });

  // Build smooth curve with Catmull-Rom → Bezier
  const buildPath = () => {
    if (points.length < 2) return "";
    const tension = 0.25;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = buildPath();
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${padding + innerH} L ${points[0].x} ${padding + innerH} Z`;
  const gradId = `dash-area-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="dash-area-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="dash-area"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padding}
            x2={width - padding}
            y1={padding + innerH * t}
            y2={padding + innerH * t}
            stroke="#EEF2F7"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={fillPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="#fff"
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="dash-area-labels">
        {series.map((s) => (
          <span key={s.label} className="dash-area-label">
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Date helpers (client-side)
// ─────────────────────────────────────────────────────────────
const startOfDayLocal = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDayLocal = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const isoDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// ─────────────────────────────────────────────────────────────
// RangeCalendar — mini month-grid range picker
// ─────────────────────────────────────────────────────────────
function RangeCalendar({
  from,
  to,
  onChange,
  maxDate,
}: {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
  maxDate?: Date;
}) {
  const [cursor, setCursor] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  // Track the "anchor" click so the second click completes the range.
  const [pendingAnchor, setPendingAnchor] = useState<Date | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay(); // Sun=0

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const today = startOfDayLocal(new Date());
  const cap = maxDate ? startOfDayLocal(maxDate) : null;

  const isDisabled = (d: Date) => (cap ? d > cap : false);

  const inRange = (d: Date) => {
    if (from && to) return d >= from && d <= to;
    if (pendingAnchor && !to) {
      // Preview while only one endpoint is chosen
      return false;
    }
    return false;
  };

  const isStart = (d: Date) => (from ? sameDay(d, from) : false);
  const isEnd = (d: Date) => (to ? sameDay(d, to) : false);

  const handleClick = (d: Date) => {
    if (isDisabled(d)) return;

    // If we already have a complete range, a fresh click starts a new range.
    if (from && to) {
      setPendingAnchor(d);
      onChange(d, null);
      return;
    }

    // Completing the range
    if (pendingAnchor ?? from) {
      const anchor = (pendingAnchor ?? from) as Date;
      if (d < anchor) {
        onChange(d, anchor);
      } else {
        onChange(anchor, d);
      }
      setPendingAnchor(null);
      return;
    }

    // Brand-new first click
    setPendingAnchor(d);
    onChange(d, null);
  };

  const monthTitle = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const DOW = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="cal">
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Previous month"
        >
          ◀
        </button>
        <span className="cal-title">{monthTitle}</span>
        <button
          type="button"
          className="cal-nav"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Next month"
        >
          ▶
        </button>
      </div>

      <div className="cal-dow">
        {DOW.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              type="button"
              className={[
                "cal-day",
                sameDay(d, today) ? "is-today" : "",
                isStart(d) ? "is-start" : "",
                isEnd(d) ? "is-end" : "",
                inRange(d) ? "is-in-range" : "",
                isDisabled(d) ? "is-disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleClick(d)}
            >
              {d.getDate()}
            </button>
          ) : (
            <span key={i} className="cal-empty" />
          ),
        )}
      </div>

      <div className="cal-actions">
        <span className="cal-hint">
          {from && !to
            ? "Pick an end date…"
            : from && to
              ? `${fmtDate(from.toISOString())} → ${fmtDate(to.toISOString())}`
              : "Pick a start date"}
        </span>
        <button
          type="button"
          className="cal-clear"
          onClick={() => {
            setPendingAnchor(null);
            onChange(null, null);
          }}
          disabled={!from && !to}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function OverviewReport({
  embedded = false,
  onBack,
}: {
  embedded?: boolean;
  onBack?: () => void;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Range state ──────────────────────────────────────────
  // Bucket is fixed to "month"; the calendar/date inputs drive the range.
  const bucket: Bucket = "month";
  // `from`/`to` null ⇒ server uses its default window on first load.
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);

  // Handle direct edits to the two <input type="date"> fields.
  const handleDateInputChange = (which: "from" | "to", value: string) => {
    if (!value) return;
    const parts = value.split("-").map((n) => Number.parseInt(n, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return;
    const [y, m, d] = parts;
    const picked = new Date(y, m - 1, d);
    if (Number.isNaN(picked.getTime())) return;

    if (which === "from") {
      const nextFrom = startOfDayLocal(picked);
      // If the new start is past the current end, collapse to a 1-day range.
      if (to && nextFrom > to) {
        setFrom(nextFrom);
        setTo(endOfDayLocal(picked));
      } else {
        setFrom(nextFrom);
      }
    } else {
      const nextTo = endOfDayLocal(picked);
      if (from && nextTo < from) {
        setFrom(startOfDayLocal(picked));
        setTo(nextTo);
      } else {
        setTo(nextTo);
      }
    }
  };

  useEffect(() => {
    // Only fetch when:
    //   • Range is unset (first load / bucket change → server uses defaults), OR
    //   • Both from AND to are picked (completed range).
    const bothPicked = !!(from && to);
    const bothUnset = !from && !to;
    if (!bothPicked && !bothUnset) return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ bucket });
        if (from) params.set("from", isoDate(from));
        if (to) params.set("to", isoDate(to));
        const res = await fetch(`/api/reports/overview?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to load overview (${res.status})`);
        }
        const json = (await res.json()) as Overview;
        if (!cancelled) {
          setData(json);
          // Hydrate local range from the server's canonical values so the UI
          // always reflects the actual applied filter (esp. on first load).
          if (bothUnset) {
            setFrom(startOfDayLocal(new Date(json.range.from)));
            setTo(endOfDayLocal(new Date(json.range.to)));
          }
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load overview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [bucket, from, to]);

  const handleCalendarChange = (nextFrom: Date | null, nextTo: Date | null) => {
    setFrom(nextFrom ? startOfDayLocal(nextFrom) : null);
    setTo(nextTo ? endOfDayLocal(nextTo) : null);
    // When the user just clicked the first endpoint, skip the refetch.
    // (Handled by the effect's deps — it only refetches when *both* are set,
    //  because we keep the previous state until full range is selected.)
  };

  const seriesMax = useMemo(() => {
    if (!data) return 0;
    return data.series.reduce(
      (m, row) => Math.max(m, row.approved, row.pending, row.declined),
      0,
    );
  }, [data]);

  const bucketLabel = bucket === "day" ? "Daily" : bucket === "week" ? "Weekly" : "Monthly";
  const bucketRangeLabel =
    bucket === "day"
      ? `last ${data?.series.length ?? 30} days`
      : bucket === "week"
        ? `last ${data?.series.length ?? 12} weeks`
        : `last ${data?.series.length ?? 6} months`;

  const declineMax = useMemo(
    () => (data ? data.declineReasons.reduce((m, r) => Math.max(m, r.count), 0) : 0),
    [data],
  );

  const fieldMax = useMemo(
    () => (data ? data.topEditedFields.reduce((m, r) => Math.max(m, r.count), 0) : 0),
    [data],
  );

  // Only show the full-screen loader on the FIRST load, when there's no
  // data to display yet. After that, keep the dashboard mounted on every
  // re-fetch (bucket change, calendar change) so the page never "flashes".
  if (loading && !data) {
    return (
      <div className={`report-viewport dash-viewport ${embedded ? "report-viewport-embedded" : ""}`}>
        <div className="report-loading">Loading system overview…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`report-viewport dash-viewport ${embedded ? "report-viewport-embedded" : ""}`}>
        <div className="report-loading">
          <p>Could not load the overview.</p>
          {error ? <p className="report-error">{error}</p> : null}
          {onBack ? (
            <button className="report-btn" onClick={onBack}>
              ← Back
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const {
    totals,
    timing,
    series,
    updateReasons,
    declineReasons,
    topEditedFields,
    recentActivity,
  } = data;

  // Counts are action-based (each approve/decline transaction counts once),
  // so dividing by application count can exceed 100%. The right denominator
  // depends on what the ring represents:
  //   • Approved / Declined → share of all *decisions* (actions)
  //   • Pending             → share of all *applications* still awaiting review
  const approvedPct =
    totals.decided === 0 ? 0 : totals.approved / totals.decided;
  const declinedPct =
    totals.decided === 0 ? 0 : totals.declined / totals.decided;
  const pendingPct = totals.all === 0 ? 0 : totals.pending / totals.all;

  // Mini "Decided" ring shows the share of *applications* that have received
  // at least one decision — always capped at 100%, app-based.
  const decidedAppsPct =
    totals.all === 0 ? 0 : Math.min(1, (totals.all - totals.pending) / totals.all);

  return (
    <div className={`report-viewport dash-viewport ${embedded ? "report-viewport-embedded" : ""}`}>
      {/* ── Toolbar ── */}
      <div className="report-toolbar print:hidden">
        {onBack ? (
          <button type="button" onClick={onBack} className="report-btn report-btn-ghost">
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div className="report-toolbar-title">
          System Overview Report
          {loading ? (
            <span className="dash-refreshing" aria-live="polite">
              <span className="dash-refreshing-dot" aria-hidden />
              Updating…
            </span>
          ) : null}
        </div>
        <div className="report-toolbar-actions" />
      </div>

      <div className="dash-grid">
        {/* ═════════════════════════════════════════════════════════
           LEFT: KPIs, charts, lists
           ═════════════════════════════════════════════════════════ */}
        <div className="dash-left">
          {/* ── KPI row ── */}
          <div className="dash-kpis">
            <div className="dash-kpi dash-kpi-orange">
              <div className="dash-kpi-top">
                <span className="dash-kpi-label">THIS MONTH TOTAL APPLICATION</span>
                <span className="dash-kpi-chip">
                  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
                    <path d="M10 4l5 6h-3v6H8v-6H5l5-6z" fill="currentColor" />
                  </svg>
                </span>
              </div>
              <div className="dash-kpi-value">{totals.all}</div>
              <div className="dash-kpi-sub">dataset</div>
            </div>

            <div className="dash-kpi dash-kpi-blue">
              <div className="dash-kpi-top">
                <span className="dash-kpi-label">APPROVAL RATE</span>
                <span className="dash-kpi-chip">
                  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
                    <path d="M4 11l4 4 8-8" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div className="dash-kpi-value">{fmtPercent(totals.approvalRate, 0)}</div>
              <div className="dash-kpi-sub">
                {totals.approved}/{totals.decided} decided
              </div>
            </div>

            <div className="dash-kpi dash-kpi-green">
              <div className="dash-kpi-top">
                <span className="dash-kpi-label">AVG PROCESSING</span>
                <span className="dash-kpi-chip">
                  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
                    <path d="M10 5v5l3 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </span>
              </div>
              <div className="dash-kpi-value">
                {fmtNumber(timing.avgProcessingDays)}
                <span className="dash-kpi-unit">days</span>
              </div>
              <div className="dash-kpi-sub">median {fmtNumber(timing.medianProcessingDays)}d</div>
            </div>

            <div className="dash-kpi dash-kpi-purple">
              <div className="dash-kpi-top">
                <span className="dash-kpi-label">PENDING REVIEW</span>
                <span className="dash-kpi-chip">
                  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
                    <path d="M6 4h8v3l-3 3 3 3v3H6v-3l3-3-3-3V4z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div className="dash-kpi-value">{totals.pending}</div>
              <div className="dash-kpi-sub">awaiting decision</div>
            </div>
          </div>

          {/* ── Row: donut breakdown + monthly bars ── */}
          <div className="dash-row dash-row-2">
            {/* Status breakdown (3 donut rings) */}
            <section className="dash-card">
              <header className="dash-card-head">
                <h3 className="dash-card-title">Status Breakdown</h3>
                <span className="dash-card-sub">
                  {totals.decided} decision{totals.decided === 1 ? "" : "s"} · {totals.all} app
                  {totals.all === 1 ? "" : "s"}
                </span>
              </header>
              <div className="dash-rings">
                <div className="dash-ring-item">
                  <DonutRing
                    percent={approvedPct}
                    color="#10B981"
                    value={totals.approved}
                    valueColor="#10B981"
                    caption={fmtPercent(approvedPct, 0)}
                  />
                  <div className="dash-ring-label">APPROVED</div>
                  <p className="dash-ring-desc">
                    Applications approved by admin reviewers.
                  </p>
                </div>
                <div className="dash-ring-item">
                  <DonutRing
                    percent={pendingPct}
                    color="#F59E0B"
                    value={totals.pending}
                    valueColor="#F59E0B"
                    caption={fmtPercent(pendingPct, 0)}
                  />
                  <div className="dash-ring-label">PENDING</div>
                  <p className="dash-ring-desc">
                    Submitted or edited, awaiting review.
                  </p>
                </div>
                <div className="dash-ring-item">
                  <DonutRing
                    percent={declinedPct}
                    color="#EF4444"
                    value={totals.declined}
                    valueColor="#EF4444"
                    caption={fmtPercent(declinedPct, 0)}
                  />
                  <div className="dash-ring-label">DECLINED</div>
                  <p className="dash-ring-desc">
                    Rejected with reason logged by admin.
                  </p>
                </div>
              </div>
            </section>

            {/* Activity (grouped bars, bucket-aware) */}
            <section className="dash-card">
              <header className="dash-card-head">
                <h3 className="dash-card-title">{bucketLabel} Activity</h3>
                <div className="dash-legend">
                  <span className="dash-legend-item">
                    <i style={{ background: "#10B981" }} /> Approved
                  </span>
                  <span className="dash-legend-item">
                    <i style={{ background: "#F59E0B" }} /> Pending
                  </span>
                  <span className="dash-legend-item">
                    <i style={{ background: "#EF4444" }} /> Declined
                  </span>
                </div>
              </header>
              {seriesMax === 0 ? (
                <p className="dash-muted">No activity in the {bucketRangeLabel}.</p>
              ) : (
                <div className="dash-bars">
                  {series.map((m) => {
                    const h = (v: number) => (seriesMax === 0 ? 0 : (v / seriesMax) * 100);
                    return (
                      <div key={m.key} className="dash-bar-group">
                        <div className="dash-bar-col">
                          <div className="dash-bar-track">
                            <div
                              className="dash-bar-fill"
                              style={{ height: `${h(m.approved)}%`, background: "#10B981" }}
                              title={`Approved: ${m.approved}`}
                            />
                          </div>
                          <div className="dash-bar-track">
                            <div
                              className="dash-bar-fill"
                              style={{ height: `${h(m.pending)}%`, background: "#F59E0B" }}
                              title={`Pending: ${m.pending}`}
                            />
                          </div>
                          <div className="dash-bar-track">
                            <div
                              className="dash-bar-fill"
                              style={{ height: `${h(m.declined)}%`, background: "#EF4444" }}
                              title={`Declined: ${m.declined}`}
                            />
                          </div>
                        </div>
                        <div className="dash-bar-label">{m.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Row: trend area + top edited fields ── */}
          <div className="dash-row dash-row-2">
            {/* Applications trend */}
            <section className="dash-card">
              <header className="dash-card-head">
                <h3 className="dash-card-title">Applications Trend</h3>
                <span className="dash-card-sub">{bucketRangeLabel}</span>
              </header>
              <AreaChart
                series={series.map((m) => ({
                  label: m.label,
                  value: m.approved + m.pending + m.declined,
                }))}
                color="#F8843F"
              />
              <div className="dash-mini-rings">
                <div className="dash-mini-ring">
                  <DonutRing
                    percent={totals.approvalRate}
                    color="#10B981"
                    size={72}
                    stroke={8}
                    value={fmtPercent(totals.approvalRate, 0)}
                    valueColor="#10B981"
                  />
                  <div className="dash-mini-ring-label">Approval</div>
                </div>
                <div className="dash-mini-ring">
                  <DonutRing
                    percent={decidedAppsPct}
                    color="#6366F1"
                    size={72}
                    stroke={8}
                    value={fmtPercent(decidedAppsPct, 0)}
                    valueColor="#6366F1"
                  />
                  <div className="dash-mini-ring-label">Decided</div>
                </div>
                <div className="dash-mini-ring">
                  <DonutRing
                    percent={totals.all === 0 ? 0 : totals.pending / totals.all}
                    color="#F59E0B"
                    size={72}
                    stroke={8}
                    value={fmtPercent(totals.all === 0 ? 0 : totals.pending / totals.all, 0)}
                    valueColor="#F59E0B"
                  />
                  <div className="dash-mini-ring-label">Pending</div>
                </div>
              </div>
            </section>

            {/* Fields most edited */}
            <section className="dash-card">
              <header className="dash-card-head">
                <h3 className="dash-card-title">Top Edited Fields</h3>
                <span className="dash-card-sub">customer edits</span>
              </header>
              {topEditedFields.length === 0 ? (
                <p className="dash-muted">No customer edits recorded.</p>
              ) : (
                <ul className="dash-hbars">
                  {topEditedFields.slice(0, 6).map((r) => {
                    const pct = fieldMax === 0 ? 0 : (r.count / fieldMax) * 100;
                    return (
                      <li key={r.field} className="dash-hbar">
                        <span className="dash-hbar-label">{labelFor(r.field)}</span>
                        <div className="dash-hbar-track">
                          <div
                            className="dash-hbar-fill"
                            style={{
                              width: `${pct}%`,
                              background:
                                "linear-gradient(90deg, #A78BFA 0%, #7C3AED 100%)",
                            }}
                          />
                        </div>
                        <span className="dash-hbar-value">{r.count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* ── Row: update reasons + decline reasons ── */}
          <div className="dash-row dash-row-2">
            {/* Approval rate by update reason */}
            <section className="dash-card">
              <header className="dash-card-head">
                <h3 className="dash-card-title">Approval Rate by Update Reason</h3>
                <span className="dash-card-sub">{updateReasons.length} reason{updateReasons.length === 1 ? "" : "s"}</span>
              </header>
              {updateReasons.length === 0 ? (
                <p className="dash-muted">No update reasons recorded.</p>
              ) : (
                <ul className="dash-hbars">
                  {updateReasons.slice(0, 6).map((r) => {
                    const pct = Math.max(0, Math.min(100, r.approvalRate * 100));
                    return (
                      <li key={r.reason} className="dash-hbar">
                        <span className="dash-hbar-label dash-capitalize">
                          {prettifyReason(r.reason)}
                        </span>
                        <div className="dash-hbar-track">
                          <div
                            className="dash-hbar-fill"
                            style={{
                              width: `${pct}%`,
                              background:
                                "linear-gradient(90deg, #34D399 0%, #10B981 100%)",
                            }}
                          />
                        </div>
                        <span className="dash-hbar-value">{fmtPercent(r.approvalRate, 0)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Top decline reasons */}
            <section className="dash-card">
              <header className="dash-card-head">
                <h3 className="dash-card-title">Top Decline Reasons</h3>
                <span className="dash-card-sub">{totals.declined} declined</span>
              </header>
              {declineReasons.length === 0 ? (
                <p className="dash-muted">No declined applications yet.</p>
              ) : (
                <ul className="dash-hbars">
                  {declineReasons.slice(0, 6).map((r) => {
                    const pct = declineMax === 0 ? 0 : (r.count / declineMax) * 100;
                    return (
                      <li key={r.reason} className="dash-hbar">
                        <span className="dash-hbar-label">{r.reason}</span>
                        <div className="dash-hbar-track">
                          <div
                            className="dash-hbar-fill"
                            style={{
                              width: `${pct}%`,
                              background:
                                "linear-gradient(90deg, #F87171 0%, #EF4444 100%)",
                            }}
                          />
                        </div>
                        <span className="dash-hbar-value">{fmtPercent(r.percent, 0)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
           RIGHT rail: Dataset / latest decision / export
           ═════════════════════════════════════════════════════════ */}
        <aside className="dash-right">
          {/* Dataset card */}
          <div className="dash-side-card">
            <div className="dash-side-head">
              <div>
                <div className="dash-side-title">REPORT</div>
                <div className="dash-side-subtitle">System Overview</div>
              </div>
              <span className="dash-side-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            <div className="dash-side-range">
              <div className="dash-side-range-label">DATASET RANGE</div>
              <input
                type="date"
                className="dash-side-range-input"
                value={from ? isoDate(from) : ""}
                max={to ? isoDate(to) : isoDate(new Date())}
                onChange={(e) => handleDateInputChange("from", e.target.value)}
                aria-label="Start date"
              />
              <div className="dash-side-range-arrow">▼</div>
              <input
                type="date"
                className="dash-side-range-input"
                value={to ? isoDate(to) : ""}
                min={from ? isoDate(from) : undefined}
                max={isoDate(new Date())}
                onChange={(e) => handleDateInputChange("to", e.target.value)}
                aria-label="End date"
              />
            </div>

            {/* Select-date header */}
            <div className="dash-select-date-label print:hidden">SELECT DATE</div>

            {/* Range calendar */}
            <div className="print:hidden">
              <RangeCalendar
                from={from}
                to={to}
                onChange={handleCalendarChange}
                maxDate={new Date()}
              />
            </div>
            <div className="dash-side-meta">
              <div>
                <span className="dash-side-meta-k">Generated</span>
                <span className="dash-side-meta-v">{fmtDateTime(data.generatedAt)}</span>
              </div>
              {data.generatedBy?.name ? (
                <div>
                  <span className="dash-side-meta-k">By</span>
                  <span className="dash-side-meta-v">{data.generatedBy.name}</span>
                </div>
              ) : null}
              <div>
                <span className="dash-side-meta-k">Records</span>
                <span className="dash-side-meta-v">{totals.all}</span>
              </div>
            </div>
          </div>

          {/* Recent activity feed (compact) */}
          <div className="dash-side-card dash-side-activity">
            <div className="dash-side-head">
              <div>
                <div className="dash-side-title">RECENT ACTIVITY</div>
                <div className="dash-side-subtitle">last {recentActivity.length} events</div>
              </div>
            </div>
            {recentActivity.length === 0 ? (
              <p className="dash-muted">No activity yet.</p>
            ) : (
              <ul className="dash-activity-list">
                {recentActivity.slice(0, 6).map((l) => (
                  <li key={l.id} className="dash-activity-item">
                    <span
                      className="dash-activity-dot"
                      style={{ background: actionColor(l.action) }}
                      aria-hidden
                    />
                    <div className="dash-activity-body">
                      <div className="dash-activity-head">
                        <strong>{actionLabel(l.action)}</strong>
                        <span className="dash-activity-date">{fmtDate(l.createdAt)}</span>
                      </div>
                      <div className="dash-activity-meta">
                        {l.actor}
                        {l.accountNumber ? ` · ${l.accountNumber}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

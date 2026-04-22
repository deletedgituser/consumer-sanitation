"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Pull shared toolbar / @page rules from the per-application report stylesheet,
// then layer on the table-specific styles.
import "../applications/[accountNumber]/report/report.css";
import "./summary.css";

// ─────────────────────────────────────────────────────────────
// Types (match /api/reports/summary response)
// ─────────────────────────────────────────────────────────────
type SummaryRow = {
  key: string;
  label: string;
  start: string;
  end: string;
  total: number;
  approved: number;
  declined: number;
  approvalRate: number;
};

type GrandTotal = {
  total: number;
  approved: number;
  declined: number;
  approvalRate: number;
};

type Summary = {
  generatedAt: string;
  generatedBy: { id: string | null; name: string | null; email: string | null };
  range: { from: string; to: string };
  grandTotal: GrandTotal;
  daily: SummaryRow[];
  weekly: SummaryRow[];
  monthly: SummaryRow[];
};

// ─────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────
const fmtDateLong = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const fmtDateTime = (iso: string) => {
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

const fmtPercent = (n: number, digits = 1) =>
  Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "—";

const fmtInt = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString(undefined) : "—";

const rateClass = (rate: number, total: number) => {
  // No applicants in this window — show a neutral muted tone, not red.
  if (total <= 0) return "sum-rate-idle";
  if (rate >= 0.8) return "sum-rate-high";
  if (rate >= 0.6) return "sum-rate-mid";
  return "sum-rate-low";
};

// ─────────────────────────────────────────────────────────────
// Date helpers for date inputs
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
const pad2 = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// ─────────────────────────────────────────────────────────────
// A single summary table (used for daily / weekly / monthly)
// ─────────────────────────────────────────────────────────────
function SummaryTable({
  sectionNumber,
  sectionTitle,
  firstColHeader,
  rows,
  rangeNote,
  emptyMessage,
  // Column labels adapt to the active dataset (applications vs tickets).
  totalLabel = "Total Applicants",
  positiveLabel = "Approved",
  negativeLabel = "Declined",
  rateLabel = "Approval Rate",
}: {
  sectionNumber: number;
  sectionTitle: string;
  firstColHeader: string;
  rows: SummaryRow[];
  rangeNote: string;
  emptyMessage: string;
  totalLabel?: string;
  positiveLabel?: string;
  negativeLabel?: string;
  rateLabel?: string;
}) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.total;
      acc.approved += r.approved;
      acc.declined += r.declined;
      return acc;
    },
    { total: 0, approved: 0, declined: 0 },
  );
  const totalRate = totals.total > 0 ? totals.approved / totals.total : 0;

  return (
    <section className="sum-section">
      <header className="sum-section-head">
        <h2 className="sum-section-title">
          <span>§{sectionNumber}</span>
          {sectionTitle}
        </h2>
        <span className="sum-section-sub">{rangeNote}</span>
      </header>

      <table className="sum-table">
        <thead>
          <tr>
            <th scope="col">{firstColHeader}</th>
            <th scope="col">{totalLabel}</th>
            <th scope="col">{positiveLabel}</th>
            <th scope="col">{negativeLabel}</th>
            <th scope="col">{rateLabel}</th>
          </tr>
        </thead>

        {rows.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={5} className="sum-empty-note">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        ) : (
          <>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={r.total === 0 ? "sum-row-empty" : ""}>
                  <td>{r.label}</td>
                  <td className="sum-mono">{fmtInt(r.total)}</td>
                  <td className="sum-mono">{fmtInt(r.approved)}</td>
                  <td className="sum-mono">{fmtInt(r.declined)}</td>
                  <td className={`sum-mono ${rateClass(r.approvalRate, r.total)}`}>
                    {r.total > 0 ? fmtPercent(r.approvalRate, 1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="sum-mono">{fmtInt(totals.total)}</td>
                <td className="sum-mono">{fmtInt(totals.approved)}</td>
                <td className="sum-mono">{fmtInt(totals.declined)}</td>
                <td className={`sum-mono ${rateClass(totalRate, totals.total)}`}>
                  {totals.total > 0 ? fmtPercent(totalRate, 1) : "—"}
                </td>
              </tr>
            </tfoot>
          </>
        )}
      </table>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function SummaryReport({
  embedded = false,
  onBack,
}: {
  embedded?: boolean;
  onBack?: () => void;
}) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default range: first day of the current month → today.
  const [from, setFrom] = useState<Date | null>(() => {
    const now = new Date();
    return startOfDayLocal(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [to, setTo] = useState<Date | null>(() => endOfDayLocal(new Date()));

  // The Summary Report is single-page by design: exactly one table
  // (Daily / Weekly / Monthly) is active at a time. The active choice drives
  // both the on-screen view and every exported document.
  type Scope = "daily" | "weekly" | "monthly";
  const [scope, setScope] = useState<Scope>("monthly");

  // Which dataset the tables are built from.
  type Dataset = "applications" | "tickets";
  const [dataset, setDataset] = useState<Dataset>("applications");

  // Dataset-specific labels used by the table + exports. Tickets re-use
  // the approved/declined columns as resolved/closed so we don't need a
  // second table component.
  const datasetMeta =
    dataset === "tickets"
      ? {
          reportTitle: "Support Ticket Summary Report",
          docTitle: "Support Ticket Summary Report",
          totalLabel: "Total Tickets",
          positiveLabel: "Resolved",
          negativeLabel: "Closed",
          rateLabel: "Resolution Rate",
          grandLabel: "tickets",
          grandExtra: (approved: number, declined: number, rate: string) =>
            `Resolved ${approved} · Closed ${declined} · ${rate} resolution rate`,
          legend:
            "Formula: Resolution Rate = (Resolved ÷ Total Tickets) × 100. Total Tickets includes every ticket submitted within the row's time window — including those still open or in review. Rows are sorted chronologically; a TOTAL footer consolidates the entire section.",
          exportFileSlug: "support-ticket-summary",
          exportHeading: "SUPPORT TICKET SUMMARY REPORT",
        }
      : {
          reportTitle: "Application Status Summary Report",
          docTitle: "Application Status Summary Report",
          totalLabel: "Total Applicants",
          positiveLabel: "Approved",
          negativeLabel: "Declined",
          rateLabel: "Approval Rate",
          grandLabel: "applicants",
          grandExtra: (approved: number, declined: number, rate: string) =>
            `Approved ${approved} · Declined ${declined} · ${rate} approval rate`,
          legend:
            "Formula: Approval Rate = (Approved ÷ Total Applicants) × 100. Total Applicants includes every application created within the row's time window — including those still pending. Rows are sorted chronologically; a TOTAL footer consolidates the entire section.",
          exportFileSlug: "application-status-summary",
          exportHeading: "APPLICATION STATUS SUMMARY REPORT",
        };

  // Export dropdown (Word / PDF / Excel).
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!exportOpen) return;
    const onDocClick = (evt: MouseEvent) => {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(evt.target as Node)) {
        setExportOpen(false);
      }
    };
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [exportOpen]);

  // Fetch whenever a complete range is set. The default range is always the
  // first day of the current month through today, but the user can change
  // either endpoint via the date inputs.
  useEffect(() => {
    if (!from || !to) return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("from", isoDate(from));
        params.set("to", isoDate(to));
        const endpoint =
          dataset === "tickets"
            ? "/api/reports/summary/tickets"
            : "/api/reports/summary";
        const res = await fetch(`${endpoint}?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to load summary (${res.status})`);
        }
        const json = (await res.json()) as Summary;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [from, to, dataset]);

  const handleDateChange = (which: "from" | "to", value: string) => {
    if (!value) return;
    const parts = value.split("-").map((n) => Number.parseInt(n, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return;
    const [y, m, d] = parts;
    const picked = new Date(y, m - 1, d);
    if (Number.isNaN(picked.getTime())) return;

    if (which === "from") {
      const nextFrom = startOfDayLocal(picked);
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

  // ─────────────────────────────────────────────────────────────
  // Export helpers — Word / PDF / Excel
  // ─────────────────────────────────────────────────────────────

  // Aggregate the totals row the same way we render it on screen.
  const sectionTotals = (rows: SummaryRow[]) => {
    const t = rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        approved: acc.approved + r.approved,
        declined: acc.declined + r.declined,
      }),
      { total: 0, approved: 0, declined: 0 },
    );
    return {
      ...t,
      rate: t.total > 0 ? (t.approved / t.total) * 100 : 0,
      rateShown: t.total > 0 ? `${((t.approved / t.total) * 100).toFixed(1)}%` : "—",
    };
  };

  // Escape a value for embedding inside HTML.
  const htmlEscape = (v: string | number) => {
    const s = String(v);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  // Build a self-contained, print-styled HTML document used by both the
  // Word and Excel exports. Office apps render this HTML natively.
  const buildExportHtml = (): string => {
    if (!data) return "";
    // Only the currently-active scope is exported — the other two tables
    // are intentionally omitted so each file is a single, focused report.
    const sections: { title: string; firstCol: string; rows: SummaryRow[] }[] = [];
    if (scope === "daily")
      sections.push({ title: "Daily Report", firstCol: "Date", rows: data.daily });
    else if (scope === "weekly")
      sections.push({
        title: "Weekly Report",
        firstCol: "Week Range",
        rows: data.weekly,
      });
    else
      sections.push({
        title: "Monthly Report",
        firstCol: "Month",
        rows: data.monthly,
      });

    const renderSection = (s: {
      title: string;
      firstCol: string;
      rows: SummaryRow[];
    }) => {
      const t = sectionTotals(s.rows);
      const rowsHtml =
        s.rows.length === 0
          ? `<tr><td colspan="5" style="padding:16px;text-align:center;font-style:italic;color:#64748b;">No activity in the selected range.</td></tr>`
          : s.rows
              .map((r, i) => {
                const rate =
                  r.total > 0 ? `${(r.approvalRate * 100).toFixed(1)}%` : "—";
                const zebra = i % 2 === 1 ? "background:#f8fafc;" : "";
                return `<tr>
                  <td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:left;${zebra}">${htmlEscape(r.label)}</td>
                  <td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:center;${zebra}">${r.total}</td>
                  <td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:center;${zebra}">${r.approved}</td>
                  <td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:center;${zebra}">${r.declined}</td>
                  <td style="padding:8px 12px;border:1px solid #cbd5e1;text-align:center;font-weight:600;${zebra}">${rate}</td>
                </tr>`;
              })
              .join("");

      return `
        <h2 style="font-size:13pt;color:#1e3a8a;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.4px;">
          ${htmlEscape(s.title)}
        </h2>
        <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin-bottom:12px;font-family:Calibri,Arial,sans-serif;font-size:11pt;">
          <thead>
            <tr>
              <th style="background:#1e3a8a;color:#ffffff;padding:10px 12px;text-align:left;border:1px solid #1e3a8a;font-size:10pt;letter-spacing:0.6px;text-transform:uppercase;">${htmlEscape(s.firstCol)}</th>
              <th style="background:#1e3a8a;color:#ffffff;padding:10px 12px;text-align:center;border:1px solid #1e3a8a;font-size:10pt;letter-spacing:0.6px;text-transform:uppercase;">${htmlEscape(datasetMeta.totalLabel)}</th>
              <th style="background:#1e3a8a;color:#ffffff;padding:10px 12px;text-align:center;border:1px solid #1e3a8a;font-size:10pt;letter-spacing:0.6px;text-transform:uppercase;">${htmlEscape(datasetMeta.positiveLabel)}</th>
              <th style="background:#1e3a8a;color:#ffffff;padding:10px 12px;text-align:center;border:1px solid #1e3a8a;font-size:10pt;letter-spacing:0.6px;text-transform:uppercase;">${htmlEscape(datasetMeta.negativeLabel)}</th>
              <th style="background:#1e3a8a;color:#ffffff;padding:10px 12px;text-align:center;border:1px solid #1e3a8a;font-size:10pt;letter-spacing:0.6px;text-transform:uppercase;">${htmlEscape(datasetMeta.rateLabel)}</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          ${
            s.rows.length > 0
              ? `<tfoot>
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:left;background:#e2e8f0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Total</td>
                    <td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:center;background:#e2e8f0;font-weight:700;">${t.total}</td>
                    <td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:center;background:#e2e8f0;font-weight:700;">${t.approved}</td>
                    <td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:center;background:#e2e8f0;font-weight:700;">${t.declined}</td>
                    <td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:center;background:#e2e8f0;font-weight:700;">${t.rateShown}</td>
                  </tr>
                </tfoot>`
              : ""
          }
        </table>
      `;
    };

    const preparedBy = data.generatedBy?.name
      ? `<br/><strong>Prepared By:</strong> ${htmlEscape(data.generatedBy.name)}`
      : "";

    // The xmlns declarations help MS Office recognise the document structure.
    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <meta name="ProgId" content="Excel.Sheet" />
  <title>${htmlEscape(datasetMeta.docTitle)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; color: #0f172a; padding: 24px; }
    h1 { font-size: 20pt; text-align: center; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.6px; }
    .meta { text-align: center; color: #334155; font-size: 11pt; line-height: 1.5; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .legend { margin-top: 18px; padding: 10px 14px; background: #f8fafc; border: 1px dashed #cbd5e1; font-size: 10pt; color: #64748b; }
  </style>
</head>
<body>
  <h1>${htmlEscape(datasetMeta.docTitle)}</h1>
  <p class="meta">
    <strong>Date Range:</strong> ${htmlEscape(fmtDateLong(data.range.from))} — ${htmlEscape(fmtDateLong(data.range.to))}
    <br/>
    <strong>Generated:</strong> ${htmlEscape(fmtDateTime(data.generatedAt))}
    ${preparedBy}
  </p>
  ${sections.map(renderSection).join("")}
  <p class="legend">${htmlEscape(datasetMeta.legend)}</p>
</body>
</html>`;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const exportWord = () => {
    if (!data) return;
    const html = buildExportHtml();
    const blob = new Blob(["\uFEFF" + html], {
      type: "application/msword;charset=utf-8",
    });
    downloadBlob(
      blob,
      `${datasetMeta.exportFileSlug}_${isoDate(new Date())}.doc`,
    );
  };

  const exportExcel = () => {
    if (!data) return;
    const html = buildExportHtml();
    const blob = new Blob(["\uFEFF" + html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    downloadBlob(
      blob,
      `${datasetMeta.exportFileSlug}_${isoDate(new Date())}.xls`,
    );
  };

  const exportPDF = async () => {
    if (!data) return;

    // Lazy-load jsPDF + autotable only when the user actually exports to keep
    // the initial admin bundle lean.
    const [{ jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = (autoTableMod as { default: typeof import("jspdf-autotable").default }).default;

    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;

    // Pick the table content based on the active scope.
    const section =
      scope === "daily"
        ? { title: "Daily Report", firstCol: "Date", rows: data.daily }
        : scope === "weekly"
          ? { title: "Weekly Report", firstCol: "Week Range", rows: data.weekly }
          : { title: "Monthly Report", firstCol: "Month", rows: data.monthly };

    // ── Title block ────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(
      datasetMeta.exportHeading,
      pageWidth / 2,
      margin + 4,
      { align: "center" },
    );

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 18, pageWidth - margin, margin + 18);

    // Metadata rows (label / value pairs, aligned on a shared column).
    const metaStartY = margin + 36;
    const metaLabelX = margin;
    const metaValueX = margin + 90;
    const metaLineGap = 14;
    doc.setFontSize(10);

    const metaRows: Array<[string, string]> = [
      [
        "DATE RANGE",
        `${fmtDateLong(data.range.from)} — ${fmtDateLong(data.range.to)}`,
      ],
      ["GENERATED", fmtDateTime(data.generatedAt)],
    ];
    if (data.generatedBy?.name) metaRows.push(["PREPARED BY", data.generatedBy.name]);

    metaRows.forEach(([label, value], i) => {
      const y = metaStartY + i * metaLineGap;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(label, metaLabelX, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(value, metaValueX, y);
    });

    // ── Section heading ────────────────────────────────────────────
    const sectionHeaderY = metaStartY + metaRows.length * metaLineGap + 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text(section.title.toUpperCase(), margin, sectionHeaderY);

    // ── Table ──────────────────────────────────────────────────────
    const t = sectionTotals(section.rows);
    const body = section.rows.map((r) => [
      r.label,
      String(r.total),
      String(r.approved),
      String(r.declined),
      r.total > 0 ? `${(r.approvalRate * 100).toFixed(1)}%` : "—",
    ]);
    const foot = [
      [
        "TOTAL",
        String(t.total),
        String(t.approved),
        String(t.declined),
        t.rateShown,
      ],
    ];

    autoTable(doc, {
      head: [
        [
          section.firstCol,
          datasetMeta.totalLabel,
          datasetMeta.positiveLabel,
          datasetMeta.negativeLabel,
          datasetMeta.rateLabel,
        ],
      ],
      body,
      foot,
      startY: sectionHeaderY + 10,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 6,
        lineColor: [203, 213, 225],
        lineWidth: 0.4,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      footStyles: {
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center", fontStyle: "bold" },
      },
      didDrawPage: (hookData) => {
        // Footer: page number + system name
        const page = doc.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(
          "Consumer Sanitation System",
          margin,
          pageHeight - 24,
        );
        doc.text(
          `Page ${hookData.pageNumber} of ${page}`,
          pageWidth - margin,
          pageHeight - 24,
          { align: "right" },
        );
      },
    });

    // ── Legend under the table ────────────────────────────────────
    type AutoTableDoc = typeof doc & {
      lastAutoTable?: { finalY: number };
    };
    const legendY = ((doc as AutoTableDoc).lastAutoTable?.finalY ?? 0) + 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const wrapped = doc.splitTextToSize(datasetMeta.legend, pageWidth - margin * 2);
    doc.text(wrapped, margin, legendY);

    doc.save(`${datasetMeta.exportFileSlug}_${isoDate(new Date())}.pdf`);
  };

  const sectionNotes = useMemo(() => {
    if (!data) {
      return { daily: "", weekly: "", monthly: "" };
    }
    const firstLast = (rows: SummaryRow[]) => {
      if (rows.length === 0) return "no rows";
      const first = rows[0];
      const last = rows[rows.length - 1];
      return `${first.label} – ${last.label}`;
    };
    return {
      daily: `${data.daily.length} day${data.daily.length === 1 ? "" : "s"} · ${firstLast(data.daily)}`,
      weekly: `${data.weekly.length} week${data.weekly.length === 1 ? "" : "s"} · ${firstLast(data.weekly)}`,
      monthly: `${data.monthly.length} month${data.monthly.length === 1 ? "" : "s"} · ${firstLast(data.monthly)}`,
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div
        className={`report-viewport sum-viewport ${
          embedded ? "sum-viewport-embedded report-viewport-embedded" : ""
        }`}
      >
        <div className="report-loading">Loading summary report…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={`report-viewport sum-viewport ${
          embedded ? "sum-viewport-embedded report-viewport-embedded" : ""
        }`}
      >
        <div className="report-loading">
          <p>Could not load the summary report.</p>
          {error ? <p className="report-error">{error}</p> : null}
          {onBack ? (
            <button type="button" className="report-btn" onClick={onBack}>
              ← Back
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`report-viewport sum-viewport ${
        embedded ? "sum-viewport-embedded report-viewport-embedded" : ""
      }`}
    >
      {/* Toolbar (matches OverviewReport pattern) */}
      <div className="report-toolbar print:hidden">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="report-btn report-btn-ghost"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div className="report-toolbar-title">
          {datasetMeta.reportTitle}
          {loading ? (
            <span className="dash-refreshing" aria-live="polite">
              <span className="dash-refreshing-dot" aria-hidden />
              Updating…
            </span>
          ) : null}
        </div>
        <div className="report-toolbar-actions" />
      </div>

      {/* Date range controls (non-printing) */}
      <div className="sum-controls print:hidden">
        <div className="sum-control">
          <label className="sum-control-label" htmlFor="sum-from">
            From
          </label>
          <input
            id="sum-from"
            type="date"
            className="sum-control-input"
            value={from ? isoDate(from) : ""}
            max={to ? isoDate(to) : isoDate(new Date())}
            onChange={(e) => handleDateChange("from", e.target.value)}
          />
        </div>
        <div className="sum-control">
          <label className="sum-control-label" htmlFor="sum-to">
            To
          </label>
          <input
            id="sum-to"
            type="date"
            className="sum-control-input"
            value={to ? isoDate(to) : ""}
            min={from ? isoDate(from) : undefined}
            max={isoDate(new Date())}
            onChange={(e) => handleDateChange("to", e.target.value)}
          />
        </div>
        <div className="sum-controls-spacer" />
        <div className="sum-controls-meta">
          <div>
            <strong>Grand Total:</strong>{" "}
            {fmtInt(data.grandTotal.total)} {datasetMeta.grandLabel}
          </div>
          <div>
            {datasetMeta.grandExtra(
              data.grandTotal.approved,
              data.grandTotal.declined,
              fmtPercent(data.grandTotal.approvalRate, 1),
            )}
          </div>
        </div>
      </div>

      {/* Dataset + Scope selector + multi-format export dropdown */}
      <div className="sum-export-bar print:hidden">
        <span className="sum-export-label">Dataset</span>

        <div
          className="sum-toggles"
          role="radiogroup"
          aria-label="Report dataset"
        >
          {(
            [
              { key: "applications", label: "Application request" },
              { key: "tickets", label: "Ticket request" },
            ] as const
          ).map(({ key, label }) => {
            const active = dataset === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                className={`sum-toggle ${active ? "is-on" : ""}`}
                onClick={() => setDataset(key)}
              >
                <span className="sum-toggle-check" aria-hidden>
                  {active ? "✓" : ""}
                </span>
                <span className="sum-toggle-label">{label}</span>
              </button>
            );
          })}
        </div>

        <span className="sum-export-divider" aria-hidden />

        <span className="sum-export-label">Scope</span>

        <div
          className="sum-toggles"
          role="radiogroup"
          aria-label="Report scope"
        >
          {(
            [
              { key: "daily", label: "Daily" },
              { key: "weekly", label: "Weekly" },
              { key: "monthly", label: "Monthly" },
            ] as const
          ).map(({ key, label }) => {
            const active = scope === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                className={`sum-toggle ${active ? "is-on" : ""}`}
                onClick={() => setScope(key)}
              >
                <span className="sum-toggle-check" aria-hidden>
                  {active ? "✓" : ""}
                </span>
                <span className="sum-toggle-label">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="sum-export-hint">
          Exporting:{" "}
          <strong>
            {dataset === "tickets" ? "Ticket " : "Application "}
            {scope.charAt(0).toUpperCase() + scope.slice(1)}
          </strong>{" "}
          report
        </div>

        <div className="sum-export-spacer" />

        <div
          className={`sum-export-menu-wrap ${exportOpen ? "is-open" : ""}`}
          ref={exportMenuRef}
        >
          <button
            type="button"
            className="sum-export-btn sum-export-btn-primary"
            onClick={() => setExportOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
          >
            <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
              <path
                d="M10 3v9m0 0l-3-3m3 3l3-3M4 15h12"
                stroke="currentColor"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export
            <span className="sum-export-caret" aria-hidden>
              ▾
            </span>
          </button>

          {exportOpen ? (
            <div className="sum-export-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="sum-export-menu-item"
                onClick={() => {
                  setExportOpen(false);
                  exportWord();
                }}
              >
                <span className="sum-export-menu-icon sum-export-menu-icon-word">
                  W
                </span>
                <span className="sum-export-menu-text">
                  <span className="sum-export-menu-title">Word document</span>
                  <span className="sum-export-menu-sub">.doc · Microsoft Word</span>
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="sum-export-menu-item"
                onClick={() => {
                  setExportOpen(false);
                  exportPDF();
                }}
              >
                <span className="sum-export-menu-icon sum-export-menu-icon-pdf">
                  P
                </span>
                <span className="sum-export-menu-text">
                  <span className="sum-export-menu-title">PDF document</span>
                  <span className="sum-export-menu-sub">
                    .pdf · Adobe Portable Document
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="sum-export-menu-item"
                onClick={() => {
                  setExportOpen(false);
                  exportExcel();
                }}
              >
                <span className="sum-export-menu-icon sum-export-menu-icon-excel">
                  X
                </span>
                <span className="sum-export-menu-text">
                  <span className="sum-export-menu-title">Excel spreadsheet</span>
                  <span className="sum-export-menu-sub">.xls · Microsoft Excel</span>
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Printable document */}
      <article className="sum-doc">
        <header className="sum-title-block">
          <h1 className="sum-title">{datasetMeta.docTitle}</h1>

          <div className="sum-subtitle">
            <span className="sum-subtitle-k">Date Range</span>
            <span className="sum-subtitle-v">
              {fmtDateLong(data.range.from)} — {fmtDateLong(data.range.to)}
            </span>

            <span className="sum-subtitle-k">Generated</span>
            <span className="sum-subtitle-v">
              {fmtDateTime(data.generatedAt)}
            </span>

            {data.generatedBy?.name ? (
              <>
                <span className="sum-subtitle-k">Prepared by</span>
                <span className="sum-subtitle-v">{data.generatedBy.name}</span>
              </>
            ) : null}
          </div>
        </header>

        {/* Only the active scope's table is rendered so the on-screen view
            matches the exported document exactly — one focused report. */}
        {scope === "daily" ? (
          <SummaryTable
            sectionNumber={1}
            sectionTitle="Daily Report"
            firstColHeader="Date"
            rows={data.daily}
            rangeNote={sectionNotes.daily}
            emptyMessage="No daily activity in the selected range."
            totalLabel={datasetMeta.totalLabel}
            positiveLabel={datasetMeta.positiveLabel}
            negativeLabel={datasetMeta.negativeLabel}
            rateLabel={datasetMeta.rateLabel}
          />
        ) : null}

        {scope === "weekly" ? (
          <SummaryTable
            sectionNumber={1}
            sectionTitle="Weekly Report"
            firstColHeader="Week Range"
            rows={data.weekly}
            rangeNote={sectionNotes.weekly}
            emptyMessage="No weekly activity in the selected range."
            totalLabel={datasetMeta.totalLabel}
            positiveLabel={datasetMeta.positiveLabel}
            negativeLabel={datasetMeta.negativeLabel}
            rateLabel={datasetMeta.rateLabel}
          />
        ) : null}

        {scope === "monthly" ? (
          <SummaryTable
            sectionNumber={1}
            sectionTitle="Monthly Report"
            firstColHeader="Month"
            rows={data.monthly}
            rangeNote={sectionNotes.monthly}
            emptyMessage="No monthly activity in the selected range."
            totalLabel={datasetMeta.totalLabel}
            positiveLabel={datasetMeta.positiveLabel}
            negativeLabel={datasetMeta.negativeLabel}
            rateLabel={datasetMeta.rateLabel}
          />
        ) : null}

        <p className="sum-legend">{datasetMeta.legend}</p>
      </article>
    </div>
  );
}

// app/api/reports/overview/route.ts
// Aggregated metrics for the "System Overview Report" page.
//
// Query params:
//   bucket = day | week | month (default: month)
//   from   = ISO date (inclusive, default depends on bucket)
//   to     = ISO date (inclusive, default: today)
//
// All metrics below respect the selected [from, to] range.
//
// Auth: session-gated (admin).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type Bucket = "day" | "week" | "month";

type StatusBucket = { pending: number; approved: number; declined: number };

const EMPTY = (): StatusBucket => ({ pending: 0, approved: 0, declined: 0 });

const bumpStatus = (bucket: StatusBucket, status: string | null | undefined) => {
  const s = String(status ?? "").toUpperCase();
  if (s === "APPROVED" || s === "SIGNED_UP") bucket.approved += 1;
  else if (s === "DECLINED") bucket.declined += 1;
  else bucket.pending += 1;
};

const median = (nums: number[]): number | null => {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

// ── Date helpers ──
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

// Week starts Monday (ISO-ish), consistent with typical admin calendars
const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sun … 6 = Sat
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const weekKey = (d: Date) => dayKey(startOfWeek(d));

const dayLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const monthLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
const weekLabel = (d: Date) => {
  const s = startOfWeek(d);
  return s.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

const getBucketKey = (d: Date, bucket: Bucket) => {
  if (bucket === "day") return dayKey(d);
  if (bucket === "week") return weekKey(d);
  return monthKey(d);
};

// ── Handler ──
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const bucketParam = (url.searchParams.get("bucket") ?? "month").toLowerCase();
    const bucket: Bucket =
      bucketParam === "day" ? "day" : bucketParam === "week" ? "week" : "month";

    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const now = new Date();
    const to = toParam ? endOfDay(new Date(toParam)) : endOfDay(now);
    let from: Date;
    if (fromParam) {
      from = startOfDay(new Date(fromParam));
    } else if (bucket === "day") {
      from = startOfDay(addDays(to, -29)); // last 30 days
    } else if (bucket === "week") {
      from = startOfWeek(addDays(to, -7 * 11)); // last 12 weeks
    } else {
      from = startOfMonth(addMonths(to, -5)); // last 6 months
    }

    // Guard against from > to
    if (from > to) {
      const tmp = from;
      from = startOfDay(to);
      // widen the "to" a bit so we always have at least today included
      const newTo = endOfDay(tmp);
      (to as Date).setTime(newTo.getTime());
    }

    // ── DB reads (range-scoped) ──
    const [applications, logs] = await Promise.all([
      prisma.application.findMany({
        where: {
          createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          accountNumber: true,
          recordNumber: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          approvedAt: true,
          declinedAt: true,
          declineReason: true,
          customerUpdateReason: true,
        },
      }),
      prisma.activityLog.findMany({
        where: {
          action: {
            in: [
              "APPLICATION_CREATED",
              "APPLICATION_UPDATED",
              "APPLICATION_APPROVED",
              "APPLICATION_DECLINED",
            ],
          },
          createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: {
          user: { select: { id: true, name: true, username: true, email: true } },
          application: { select: { accountNumber: true, recordNumber: true } },
        },
      }),
    ]);

    // ── Totals (in range) ──
    const totals = { ...EMPTY(), all: applications.length };
    for (const a of applications) bumpStatus(totals, a.status);
    const decided = totals.approved + totals.declined;
    const approvalRate = decided ? totals.approved / decided : 0;

    // ── Processing time ──
    const processingDays: number[] = [];
    for (const a of applications) {
      const decisionAt = a.approvedAt ?? a.declinedAt;
      if (!decisionAt) continue;
      const days =
        (new Date(decisionAt).getTime() - new Date(a.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (Number.isFinite(days) && days >= 0) processingDays.push(days);
    }
    const avgProcessingDays = processingDays.length
      ? processingDays.reduce((s, x) => s + x, 0) / processingDays.length
      : null;
    const medianProcessingDays = median(processingDays);

    // ── Time-series buckets ──
    type Row = {
      key: string;
      label: string;
      start: string;
      end: string;
      pending: number;
      approved: number;
      declined: number;
    };
    const series: Row[] = [];

    if (bucket === "day") {
      for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
        series.push({
          key: dayKey(d),
          label: dayLabel(d),
          start: startOfDay(d).toISOString(),
          end: endOfDay(d).toISOString(),
          ...EMPTY(),
        });
      }
    } else if (bucket === "week") {
      let d = startOfWeek(from);
      while (d <= to) {
        const end = endOfDay(addDays(d, 6));
        series.push({
          key: weekKey(d),
          label: weekLabel(d),
          start: startOfDay(d).toISOString(),
          end: end.toISOString(),
          ...EMPTY(),
        });
        d = addDays(d, 7);
      }
    } else {
      let d = startOfMonth(from);
      while (d <= to) {
        series.push({
          key: monthKey(d),
          label: monthLabel(d),
          start: startOfDay(d).toISOString(),
          end: endOfMonth(d).toISOString(),
          ...EMPTY(),
        });
        d = addMonths(d, 1);
      }
    }

    for (const a of applications) {
      const key = getBucketKey(new Date(a.createdAt), bucket);
      const row = series.find((s) => s.key === key);
      if (!row) continue;
      bumpStatus(row, a.status);
    }

    // ── Approval rate by update reason ──
    const reasonMap = new Map<string, StatusBucket & { total: number }>();
    for (const a of applications) {
      const reason = (a.customerUpdateReason ?? "").trim() || "(no reason)";
      const current = reasonMap.get(reason) ?? { ...EMPTY(), total: 0 };
      current.total += 1;
      bumpStatus(current, a.status);
      reasonMap.set(reason, current);
    }
    const updateReasons = Array.from(reasonMap.entries())
      .map(([reason, b]) => {
        const localDecided = b.approved + b.declined;
        return {
          reason,
          total: b.total,
          pending: b.pending,
          approved: b.approved,
          declined: b.declined,
          approvalRate: localDecided ? b.approved / localDecided : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    // ── Decline reasons ──
    const declineMap = new Map<string, number>();
    for (const a of applications) {
      if (String(a.status ?? "").toUpperCase() !== "DECLINED") continue;
      const reason = (a.declineReason ?? "").trim() || "Not specified";
      declineMap.set(reason, (declineMap.get(reason) ?? 0) + 1);
    }
    const declinedTotal = Array.from(declineMap.values()).reduce((s, x) => s + x, 0) || 0;
    const declineReasons = Array.from(declineMap.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percent: declinedTotal ? count / declinedTotal : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Top edited fields (logs in range) ──
    const fieldCount = new Map<string, number>();
    for (const l of logs) {
      if (l.action !== "APPLICATION_UPDATED") continue;
      const md: any = l.metadata;
      if (!md?.diff || typeof md.diff !== "object") continue;
      for (const key of Object.keys(md.diff)) {
        fieldCount.set(key, (fieldCount.get(key) ?? 0) + 1);
      }
    }
    const topEditedFields = Array.from(fieldCount.entries())
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Recent activity (range-scoped) ──
    const recentActivity = logs.slice(0, 15).map((l) => {
      const md: any = l.metadata ?? {};
      const actor =
        l.user?.name ||
        l.user?.username ||
        l.userEmail ||
        (md?.source === "customer" ? "Customer" : "System");
      return {
        id: l.id,
        action: l.action,
        createdAt: l.createdAt,
        description: l.description ?? null,
        actor,
        accountNumber: l.application?.accountNumber ?? null,
        recordNumber: l.application?.recordNumber ?? null,
        fieldCount: md?.diff ? Object.keys(md.diff).length : 0,
      };
    });

    const generatedBy = {
      id: session.user.id ?? null,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    };

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      generatedBy,
      range: {
        bucket,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      totals: {
        all: totals.all,
        pending: totals.pending,
        approved: totals.approved,
        declined: totals.declined,
        decided,
        approvalRate,
      },
      timing: {
        avgProcessingDays,
        medianProcessingDays,
        sampleSize: processingDays.length,
      },
      series,
      updateReasons,
      declineReasons,
      topEditedFields,
      recentActivity,
    });
  } catch (err) {
    console.error("[GET /api/reports/overview]", err);
    return NextResponse.json(
      { error: "Failed to build overview report" },
      { status: 500 },
    );
  }
}

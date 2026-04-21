// app/api/reports/summary/route.ts
// "Application Status Summary Report"
//
// Returns three aggregated tables — daily, weekly, and monthly —
// for the selected [from, to] range. Each row carries:
//   { key, label, total, approved, declined, approvalRate }
//
// Query params:
//   from = ISO date (inclusive, default: last 6 months)
//   to   = ISO date (inclusive, default: today)
//
// Auth: session-gated (admin).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ── Date helpers (local timezone) ─────────────────────────────────
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
// Week starts Monday
const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sun, 6 = Sat
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
  d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
const monthLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
const weekLabel = (d: Date) => {
  const start = startOfWeek(d);
  const end = addDays(start, 6);
  // "Mar 25 – Mar 31, 2026" (or "Dec 30, 2025 – Jan 05, 2026" spanning years)
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endFmt = end.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
};

type Row = {
  key: string;
  label: string;
  start: string;
  end: string;
  total: number;
  approved: number;
  declined: number;
  approvalRate: number; // 0..1
};

const finalizeRate = (r: Omit<Row, "approvalRate">): Row => ({
  ...r,
  approvalRate: r.total > 0 ? r.approved / r.total : 0,
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const now = new Date();
    const to = toParam ? endOfDay(new Date(toParam)) : endOfDay(now);
    const from = fromParam
      ? startOfDay(new Date(fromParam))
      : startOfMonth(addMonths(to, -5)); // default: last 6 months

    // Pull every approve/decline action in the range. Each ActivityLog row
    // is one administrative transaction — an account that was approved,
    // re-edited by the customer, and approved again contributes *two*
    // approvals. Counts are therefore action-based, not status-based.
    const actions = await prisma.activityLog.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        action: { in: ["APPLICATION_APPROVED", "APPLICATION_DECLINED"] },
      },
      select: {
        id: true,
        action: true,
        createdAt: true,
      },
    });

    // ── Build empty buckets so tables show zero rows for inactive days ──
    const dailyMap = new Map<string, Omit<Row, "approvalRate">>();
    const weeklyMap = new Map<string, Omit<Row, "approvalRate">>();
    const monthlyMap = new Map<string, Omit<Row, "approvalRate">>();

    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
      const k = dayKey(d);
      dailyMap.set(k, {
        key: k,
        label: dayLabel(d),
        start: startOfDay(d).toISOString(),
        end: endOfDay(d).toISOString(),
        total: 0,
        approved: 0,
        declined: 0,
      });
    }

    for (let d = startOfWeek(from); d <= to; d = addDays(d, 7)) {
      const end = endOfDay(addDays(d, 6));
      const k = weekKey(d);
      weeklyMap.set(k, {
        key: k,
        label: weekLabel(d),
        start: startOfDay(d).toISOString(),
        end: end.toISOString(),
        total: 0,
        approved: 0,
        declined: 0,
      });
    }

    for (let d = startOfMonth(from); d <= to; d = addMonths(d, 1)) {
      const k = monthKey(d);
      monthlyMap.set(k, {
        key: k,
        label: monthLabel(d),
        start: startOfDay(d).toISOString(),
        end: endOfMonth(d).toISOString(),
        total: 0,
        approved: 0,
        declined: 0,
      });
    }

    // ── Fill buckets (one increment per action / transaction) ──
    for (const a of actions) {
      const occurred = new Date(a.createdAt);
      const dk = dayKey(occurred);
      const wk = weekKey(occurred);
      const mk = monthKey(occurred);
      const isApproved = a.action === "APPLICATION_APPROVED";
      const isDeclined = a.action === "APPLICATION_DECLINED";

      const bump = (bucket: Omit<Row, "approvalRate"> | undefined) => {
        if (!bucket) return;
        // Total = every decision action in the bucket (approved + declined).
        bucket.total += 1;
        if (isApproved) bucket.approved += 1;
        else if (isDeclined) bucket.declined += 1;
      };

      bump(dailyMap.get(dk));
      bump(weeklyMap.get(wk));
      bump(monthlyMap.get(mk));
    }

    // ── Sort + finalize ──
    const sortByStart = (
      a: Omit<Row, "approvalRate">,
      b: Omit<Row, "approvalRate">,
    ) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0);

    const daily = Array.from(dailyMap.values()).sort(sortByStart).map(finalizeRate);
    const weekly = Array.from(weeklyMap.values()).sort(sortByStart).map(finalizeRate);
    const monthly = Array.from(monthlyMap.values()).sort(sortByStart).map(finalizeRate);

    // ── Grand totals (sum of every decision action in the range) ──
    const grand = actions.reduce(
      (acc, a) => {
        acc.total += 1;
        if (a.action === "APPLICATION_APPROVED") acc.approved += 1;
        else if (a.action === "APPLICATION_DECLINED") acc.declined += 1;
        return acc;
      },
      { total: 0, approved: 0, declined: 0 },
    );

    const generatedBy = {
      id: session.user.id ?? null,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    };

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      generatedBy,
      range: { from: from.toISOString(), to: to.toISOString() },
      grandTotal: {
        ...grand,
        approvalRate: grand.total > 0 ? grand.approved / grand.total : 0,
      },
      daily,
      weekly,
      monthly,
    });
  } catch (err) {
    console.error("[GET /api/reports/summary]", err);
    return NextResponse.json(
      { error: "Failed to build summary report" },
      { status: 500 },
    );
  }
}

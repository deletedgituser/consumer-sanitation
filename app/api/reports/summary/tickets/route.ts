// app/api/reports/summary/tickets/route.ts
// "Support Ticket Summary Report"
//
// Mirrors the shape of /api/reports/summary so the admin Summary Report
// component can swap datasets without having to re-architect its rendering
// or its export pipeline. Each row carries:
//   { key, label, total, approved, declined, approvalRate }
// where:
//   • total    → every ticket CREATED in the row's time window (status-agnostic)
//   • approved → tickets in that window whose current status is RESOLVED
//   • declined → tickets in that window whose current status is CLOSED
//   • approvalRate → approved / total  (a "resolution rate")
//
// Query params:
//   from = ISO date (inclusive, default: last 6 months)
//   to   = ISO date (inclusive, default: today)
//
// Auth: session-gated (admin).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ── Date helpers (local timezone, matches the application summary API) ──
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
const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  const day = x.getDay();
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
  approved: number; // RESOLVED  (mapped so the UI can reuse the applications table)
  declined: number; // CLOSED
  approvalRate: number; // resolved / total
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
      : startOfMonth(addMonths(to, -5));

    // Pull every ticket created in the range with its current status.
    const tickets = await prisma.supportTicket.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { id: true, createdAt: true, status: true },
    });

    // Pre-seed empty buckets so inactive rows still appear with zeros.
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

    // Fill buckets — one ticket contributes +1 to total, and +1 to resolved/closed
    // columns based on its *current* status.
    for (const t of tickets) {
      const occurred = new Date(t.createdAt);
      const dk = dayKey(occurred);
      const wk = weekKey(occurred);
      const mk = monthKey(occurred);
      const isResolved = t.status === "RESOLVED";
      const isClosed = t.status === "CLOSED";

      const bump = (bucket: Omit<Row, "approvalRate"> | undefined) => {
        if (!bucket) return;
        bucket.total += 1;
        if (isResolved) bucket.approved += 1;
        else if (isClosed) bucket.declined += 1;
      };

      bump(dailyMap.get(dk));
      bump(weeklyMap.get(wk));
      bump(monthlyMap.get(mk));
    }

    const sortByStart = (
      a: Omit<Row, "approvalRate">,
      b: Omit<Row, "approvalRate">,
    ) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0);

    const daily = Array.from(dailyMap.values())
      .sort(sortByStart)
      .map(finalizeRate);
    const weekly = Array.from(weeklyMap.values())
      .sort(sortByStart)
      .map(finalizeRate);
    const monthly = Array.from(monthlyMap.values())
      .sort(sortByStart)
      .map(finalizeRate);

    const grand = tickets.reduce(
      (acc, t) => {
        acc.total += 1;
        if (t.status === "RESOLVED") acc.approved += 1;
        else if (t.status === "CLOSED") acc.declined += 1;
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
    console.error("[GET /api/reports/summary/tickets]", err);
    return NextResponse.json(
      { error: "Failed to build ticket summary report" },
      { status: 500 },
    );
  }
}

// app/api/applications/[accountNumber]/report/route.ts
// Returns a single "report bundle" for an application so the admin report page
// can render everything (customer info, summary, timeline, diffs, admin
// actions, notifications) in a single request.
//
// Auth: requires an authenticated session (any logged-in user — typically admin).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountNumber } = await params;
    if (!accountNumber) {
      return NextResponse.json({ error: "Account number required" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { accountNumber },
      include: {
        createdBy: { select: { id: true, username: true, name: true, email: true } },
        updatedBy: { select: { id: true, username: true, name: true, email: true } },
        documents: true,
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 200,
          include: {
            user: { select: { id: true, username: true, name: true, email: true } },
          },
        },
        notifications: {
          where: { type: { in: ["INFO", "APPROVED", "DECLINED"] } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const generatedBy = {
      id: session.user.id ?? null,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    };

    return NextResponse.json({
      application,
      logs: application.activityLogs,
      notifications: application.notifications,
      generatedAt: new Date().toISOString(),
      generatedBy,
    });
  } catch (err) {
    console.error("[GET /api/applications/:account/report]", err);
    return NextResponse.json(
      { error: "Failed to build report" },
      { status: 500 },
    );
  }
}

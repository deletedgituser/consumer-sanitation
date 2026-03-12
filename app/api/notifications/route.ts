import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/notifications - list unread notifications (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = (searchParams.get("unread") ?? "true").toLowerCase() !== "false";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 50);

    const notifications = await prisma.notification.findMany({
      where: unreadOnly ? { read: false } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        application: {
          select: {
            id: true,
            accountNumber: true,
            recordNumber: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications - toggle notifications read/unread (bulk)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { ids?: string[]; read?: boolean };
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x) => typeof x === "string" && x.length > 0) : [];
    const readFlag = typeof body?.read === "boolean" ? body.read : true;

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
    }

    const result = await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { read: readFlag },
    });

    return NextResponse.json({ updated: result.count });
  } catch {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}


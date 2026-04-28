import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/** Prevent cached responses from serving stale rows without the admin type filter (Next.js 13+). */
export const dynamic = "force-dynamic";

// GET /api/notifications — admin bell: bulletin only (new application + new ticket). Customer
// types (PENDING, APPROVED, DECLINED, INFO) are never returned from this route.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = (searchParams.get("unread") ?? "true").toLowerCase() !== "false";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 50);

    const where = {
      type: {
        in: [NotificationType.ADMIN_APPLICATION, NotificationType.ADMIN_TICKET],
      },
      ...(unreadOnly ? { read: false } : {}),
    };

    const notifications = await prisma.notification.findMany({
      where,
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

    return NextResponse.json(notifications, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
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
      where: {
        id: { in: ids },
        type: {
          in: [NotificationType.ADMIN_APPLICATION, NotificationType.ADMIN_TICKET],
        },
      },
      data: { read: readFlag },
    });

    return NextResponse.json({ updated: result.count });
  } catch {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

// DELETE /api/notifications — remove notifications by id (admin clears inbox)
// Body: { ids: string[] } — required; caller should list ids from GET (e.g. limit=500).
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
    }

    const result = await prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        type: {
          in: [NotificationType.ADMIN_APPLICATION, NotificationType.ADMIN_TICKET],
        },
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch {
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 });
  }
}


// app/api/applications/[accountNumber]/notifications/route.ts - Get and Create notifications for an application
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { excludeAdminOnlyNotification } from "@/lib/customer-notification-filter";

type NotificationType = "PENDING" | "APPROVED" | "DECLINED" | "INFO";

// GET /api/applications/[accountNumber]/notifications - List notifications for this application
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const { accountNumber } = await params;
    if (!accountNumber) {
      return NextResponse.json({ error: "Account number required" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { accountNumber },
      select: { id: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Customer bell: application lifecycle (PENDING / APPROVED / DECLINED) plus INFO for
    // operational messages (e.g. edits submitted, ticket status). Never ADMIN_* bulletin rows.
    const notifications = await prisma.notification.findMany({
      where: {
        applicationId: application.id,
        type: {
          in: ["PENDING", "INFO", "APPROVED", "DECLINED"],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        application: {
          select: {
            recordNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(excludeAdminOnlyNotification(notifications));
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/applications/[accountNumber]/notifications - Create a notification (for tracking)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const { accountNumber } = await params;
    if (!accountNumber) {
      return NextResponse.json({ error: "Account number required" }, { status: 400 });
    }

    const body = await request.json();
    const { message, type } = body as { message?: string; type?: string };

    const rawType = String(type ?? "").toUpperCase();
    if (rawType.startsWith("ADMIN_")) {
      return NextResponse.json(
        { error: "Admin bulletin types cannot be created through this endpoint." },
        { status: 400 },
      );
    }

    if (!message || typeof message !== "string" || message.length > 500) {
      return NextResponse.json(
        { error: "Invalid message (required, max 500 chars)" },
        { status: 400 }
      );
    }

    const allowedTypes: NotificationType[] = ["PENDING", "APPROVED", "DECLINED", "INFO"];
    const notificationType = (type?.toUpperCase() || "INFO") as NotificationType;
    if (!allowedTypes.includes(notificationType)) {
      return NextResponse.json(
        { error: "Invalid type. Use PENDING, APPROVED, DECLINED, or INFO" },
        { status: 400 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { accountNumber },
      select: { id: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const notification = await prisma.notification.create({
      data: {
        applicationId: application.id,
        message: message.trim(),
        type: notificationType,
      },
    });

    return NextResponse.json(notification);
  } catch {
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

// PATCH /api/applications/[accountNumber]/notifications - Mark notifications as read/unread
// Body: { read?: boolean }  (default: true — "mark all as read")
// Body: { read?: boolean, notificationIds?: string[] } — update specific rows (e.g. one tap)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const { accountNumber } = await params;
    if (!accountNumber) {
      return NextResponse.json({ error: "Account number required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const readFlag = typeof body?.read === "boolean" ? body.read : true;
    const notificationIds = Array.isArray(body?.notificationIds)
      ? (body.notificationIds as unknown[]).filter(
          (x): x is string => typeof x === "string" && x.length > 0
        )
      : null;

    const application = await prisma.application.findUnique({
      where: { accountNumber },
      select: { id: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const typeFilter = { in: ["PENDING", "INFO", "APPROVED", "DECLINED"] as const };

    if (notificationIds && notificationIds.length > 0) {
      const result = await prisma.notification.updateMany({
        where: {
          applicationId: application.id,
          type: typeFilter,
          id: { in: notificationIds },
        },
        data: { read: readFlag },
      });
      return NextResponse.json({ updated: result.count });
    }

    const result = await prisma.notification.updateMany({
      where: {
        applicationId: application.id,
        type: typeFilter,
        read: !readFlag,
      },
      data: { read: readFlag },
    });

    return NextResponse.json({ updated: result.count });
  } catch {
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[accountNumber]/notifications - Clear all notifications for this application
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const { accountNumber } = await params;
    if (!accountNumber) {
      return NextResponse.json({ error: "Account number required" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { accountNumber },
      select: { id: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const result = await prisma.notification.deleteMany({
      where: {
        applicationId: application.id,
        type: { in: ["PENDING", "INFO", "APPROVED", "DECLINED"] },
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear notifications" },
      { status: 500 }
    );
  }
}

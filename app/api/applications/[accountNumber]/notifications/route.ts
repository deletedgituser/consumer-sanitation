// app/api/applications/[accountNumber]/notifications/route.ts - Get and Create notifications for an application
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const notifications = await prisma.notification.findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notifications);
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
      where: { applicationId: application.id },
    });

    return NextResponse.json({ deleted: result.count });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear notifications" },
      { status: 500 }
    );
  }
}

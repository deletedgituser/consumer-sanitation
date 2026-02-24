// app/api/applications/[id]/route.ts - Get, Update, Delete single application
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/applications/[id] - Get single application
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        documents: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

// PATCH /api/applications/[id] - Update application
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...updateData } = body;

    // ensure we have an id from params
    const appId = params?.id || new URL(request.url).pathname.split("/").pop();
    console.log("PATCH application id:", appId, "params", params);
    if (!appId) {
      return NextResponse.json({ error: "Missing application id" }, { status: 400 });
    }

    // Check if application exists
    const existing = await prisma.application.findUnique({
      where: { id: appId },
    });
    // also later use appId for updates etc
    

    if (!existing) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Handle specific actions
    let logAction: string | undefined;
    let statusUpdate = {};

    if (action === "approve") {
      statusUpdate = {
        status: "APPROVED",
        approvedAt: new Date(),
      };
      logAction = "APPLICATION_APPROVED";
    } else if (action === "decline") {
      statusUpdate = {
        status: "DECLINED",
        declinedAt: new Date(),
      };
      logAction = "APPLICATION_DECLINED";
    } else if (action === "edit") {
      logAction = "APPLICATION_UPDATED";
    }

    // Update application
    const application = await prisma.application.update({
      where: { id: appId },
      data: {
        ...updateData,
        ...statusUpdate,
        updatedById: session.user.id,
        updatedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    // Log the activity
    if (logAction) {
      await prisma.activityLog.create({
        data: {
          action: logAction as any,
          description: `Application ${action || 'updated'}: ${application.recordNumber}`,
          applicationId: application.id,
          userId: session.user.id,
          userEmail: session.user.email || undefined,
          metadata: {
            recordNumber: application.recordNumber,
            firstName: application.firstName,
            lastName: application.lastName,
            previousStatus: existing.status,
            newStatus: application.status,
          },
        },
      });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id] - Delete application
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete applications" },
        { status: 403 }
      );
    }

    // derive id (same logic as PATCH)
    const appId = params?.id || new URL(request.url).pathname.split("/").pop();
    if (!appId) {
      return NextResponse.json({ error: "Missing application id" }, { status: 400 });
    }

    // Check if application exists
    const existing = await prisma.application.findUnique({
      where: { id: appId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Delete application (cascaded deletes will handle documents)
    await prisma.application.delete({
      where: { id: appId },
    });

    // Log the deletion
    await prisma.activityLog.create({
      data: {
        action: "APPLICATION_DELETED",
        description: `Application deleted: ${existing.recordNumber}`,
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        metadata: {
          recordNumber: existing.recordNumber,
          firstName: existing.firstName,
          lastName: existing.lastName,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}

// app/api/applications/[accountNumber]/route.ts - Get, Update, Delete single application (uses accountNumber parameter)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Convert snake_case field names (from API payload) to camelCase (Prisma schema)
 */
function convertSnakeToCamel(obj: Record<string, any>): Record<string, any> {
  const camelCased: Record<string, any> = {};

  const fieldMap: Record<string, string> = {
    app_type: "appType",
    first_name: "firstName",
    middle_name: "middleName",
    last_name: "lastName",
    suffix_name: "suffixName",
    no_middle_name: "noMiddleName",
    civil_status: "civilStatus",
    spouse_first: "spouseFirst",
    spouse_middle: "spouseMiddle",
    spouse_last: "spouseLast",
    spouse_suffix: "spouseSuffix",
    spouse_birthdate: "spouseBirthdate",
    residence_address: "residenceAddress",
    privacy_consent: "privacyConsent",
    privacy_newsletter: "privacyNewsletter",
    privacy_email: "privacyEmail",
    privacy_sms: "privacySms",
    privacy_phone: "privacyPhone",
    privacy_social: "privacySocial",
    or_number: "orNumber",
    date_issued: "dateIssued",
  };

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = fieldMap[key] || key;
    camelCased[camelKey] = value;
  }

  return camelCased;
}

// GET /api/applications/[accountNumber] - Get single application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const { accountNumber } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await prisma.application.findUnique({
      where: { accountNumber },
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
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

// PATCH /api/applications/[accountNumber] - Update application
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const { accountNumber } = await params;

    const body = await request.json();
    const { action, ...updateData } = body;

    // Authentication is required for approve/decline, but optional for edits
    const session = await auth();
    const isAdminAction = action === "approve" || action === "decline";

    if (isAdminAction && !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if application exists
    const existing = await prisma.application.findUnique({
      where: { accountNumber },
    });

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
    } else if (action === "edit" || !action) {
      statusUpdate = {
        status: "PENDING",
        approvedAt: null,
        declinedAt: null,
      };
      logAction = "APPLICATION_UPDATED";
    }

    // Update application
    const convertedData = convertSnakeToCamel(updateData);
    if (action === "edit" || !action) {
      delete convertedData.status;
    }
    const updatePayload: any = {
      ...convertedData,
      ...statusUpdate,
      updatedAt: new Date(),
    };

    // Only set updatedById if user is authenticated (for admin actions)
    if (session?.user) {
      updatePayload.updatedById = session.user.id;
    }

    const application = await prisma.application.update({
      where: { accountNumber },
      data: updatePayload,
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

    // Log the activity (only if authenticated)
    if (logAction && session?.user) {
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
  } catch {
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[accountNumber] - Delete application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const { accountNumber } = await params;
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

    // Check if application exists
    const existing = await prisma.application.findUnique({
      where: { accountNumber },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Delete application (cascaded deletes will handle documents)
    await prisma.application.delete({
      where: { accountNumber },
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
  } catch {
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}

// app/api/applications/[accountNumber]/route.ts - Get, Update, Delete single application (uses accountNumber parameter)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { auth } from "@/auth";
import { isValidMobileNumber, normalizeMobileNumber } from "@/lib/account-verification";

function buildDiff(
  before: Record<string, any>,
  afterPatch: Record<string, any>,
) {
  const diff: Record<string, { before: string; after: string }> = {};
  for (const [key, afterVal] of Object.entries(afterPatch)) {
    if (afterVal === undefined) continue;
    const beforeVal = (before as any)[key];
    const b = String(beforeVal ?? "");
    const a = String(afterVal ?? "");
    if (b !== a) diff[key] = { before: b, after: a };
  }
  return diff;
}

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
    decline_reason: "declineReason",
    customer_update_reason: "customerUpdateReason",
    contact_number_for_contacting: "contactNumberForContacting",
  };

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = fieldMap[key] || key;
    camelCased[camelKey] = value;
  }

  return camelCased;
}

function labelApplicationKind(appType: string | null | undefined): string {
  const u = String(appType ?? "").toUpperCase();
  if (u === "NEW") return "new application";
  if (u === "CHANGE") return "transfer or change-of-service application";
  return appType ?? "application";
}

function labelMembership(mt: string | null | undefined): string {
  const u = String(mt ?? "").toUpperCase();
  if (u === "HOUSEHOLD") return "Household membership";
  if (u === "CORPORATE") return "Corporate membership";
  return mt ?? "membership";
}

function adminCustomerSubmissionMessage(app: {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  appType: string | null;
  membership: string | null;
  accountNumber: string | null;
  recordNumber: string;
}): string {
  const fullName = [app.firstName, app.middleName, app.lastName].filter(Boolean).join(" ").trim();
  const acctLabel = app.accountNumber?.trim() ? app.accountNumber : "account pending assignment";
  return `${fullName || "Applicant"} submitted a ${labelApplicationKind(app.appType)} (${labelMembership(
    app.membership,
  )}) for account ${acctLabel}. Record #${app.recordNumber}.`.slice(0, 500);
}

async function notifyAdminCustomerSubmission(
  applicationId: string,
  message: string,
  windowMs = 120_000,
) {
  const recent = await prisma.notification.findFirst({
    where: {
      applicationId,
      type: NotificationType.ADMIN_APPLICATION,
      createdAt: { gt: new Date(Date.now() - windowMs) },
    },
    select: { id: true },
  });
  if (recent) return;
  await prisma.notification.create({
    data: {
      applicationId,
      type: NotificationType.ADMIN_APPLICATION,
      message,
      read: false,
    },
  });
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
        activityLogs: {
          where: {
            action: {
              in: ["APPLICATION_UPDATED", "APPLICATION_APPROVED", "APPLICATION_DECLINED"],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
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
    const { action, source, ...updateData } = body;

    // Authentication is required for approve/decline, but optional for edits
    const session = await auth();
    const isAdminAction =
      action === "approve" || action === "decline" || action === "admin_edit";

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
    } else if (action === "admin_edit") {
      statusUpdate = {};
      logAction = "APPLICATION_UPDATED";
    }

    // Update application
    const convertedData = convertSnakeToCamel(updateData);

    // Only keep fields that actually exist on the Application model to avoid Prisma errors
    const allowedKeys = new Set([
      "appType",
      "membership",
      "status",
      "area",
      "district",
      "barangay",
      "residenceAddress",
      "firstName",
      "middleName",
      "lastName",
      "suffixName",
      "birthdate",
      "noMiddleName",
      "gender",
      "civilStatus",
      "spouseFirst",
      "spouseMiddle",
      "spouseLast",
      "spouseSuffix",
      "spouseBirthdate",
      "cellphone",
      "contactNumberForContacting",
      "landline",
      "email",
      "privacyConsent",
      "privacyNewsletter",
      "privacyEmail",
      "privacySms",
      "privacyPhone",
      "privacySocial",
      "cosignatory",
      "witness",
      "notes",
      "orNumber",
      "dateIssued",
      "submittedAt",
      "approvedAt",
      "declinedAt",
      "declineReason",
      "customerUpdateReason",
    ]);

    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(convertedData)) {
      if (allowedKeys.has(key)) {
        filteredData[key] = value;
      }
    }

    if (action === "edit" || !action) {
      delete filteredData.status;
    }

    if ((action === "edit" || !action) && source === "customer") {
      const nextMobileValue =
        typeof filteredData.contactNumberForContacting === "string"
          ? filteredData.contactNumberForContacting
          : "";

      if (!isValidMobileNumber(nextMobileValue)) {
        return NextResponse.json(
          { error: "A valid active mobile number is required." },
          { status: 400 },
        );
      }

      filteredData.contactNumberForContacting = normalizeMobileNumber(nextMobileValue);
    }

    const updatePayload: any = {
      ...filteredData,
      ...statusUpdate,
      updatedAt: new Date(),
    };

    // Only set updatedById if the session user actually exists in the User table.
    // If the DB was re-seeded after login, session.user.id could point to a user
    // that no longer exists and Prisma would throw a FK error on update.
    let sessionUserIsValid = false;
    if (session?.user?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });
      if (dbUser) {
        sessionUserIsValid = true;
        updatePayload.updatedById = session.user.id;
      } else {
        console.warn(
          `[PATCH /api/applications/${accountNumber}] session.user.id ${session.user.id} not found in User table; skipping updatedById`,
        );
      }
    }

    const includeRelations = {
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
    };

    let application;
    try {
      application = await prisma.application.update({
        where: { accountNumber },
        data: updatePayload,
        include: includeRelations,
      });
    } catch (firstErr) {
      // DB not migrated yet: column `customerUpdateReason` missing → retry without it so saves still work.
      const errText = String(firstErr instanceof Error ? firstErr.message : firstErr);
      const missingOptionalColumn =
        (updatePayload.customerUpdateReason !== undefined || updatePayload.contactNumberForContacting !== undefined) &&
        /customerUpdateReason|contactNumberForContacting|Unknown column|1054/i.test(errText);
      if (missingOptionalColumn) {
        const {
          customerUpdateReason: _dropReason,
          contactNumberForContacting: _dropContactOnly,
          ...rest
        } = updatePayload;
        application = await prisma.application.update({
          where: { accountNumber },
          data: rest,
          include: includeRelations,
        });
      } else {
        throw firstErr;
      }
    }

    // Notify the customer every time an admin approves or declines their
    // application. This is independent of the admin's session validity: the
    // customer must always see the status update in their bell, even if the
    // admin's session user has become stale (e.g. after a DB re-seed).
    const prevStatus = (existing.status ?? "").toString();
    const newStatus = (application.status ?? "").toString();
    const didStatusChange = prevStatus !== newStatus;
    const shouldCreateStatusNotification =
      didStatusChange && (action === "approve" || action === "decline");

    if (shouldCreateStatusNotification) {
      const notifType = newStatus === "APPROVED" ? "APPROVED" : newStatus === "DECLINED" ? "DECLINED" : null;

      const fullName = [application.firstName, application.middleName, application.lastName]
        .filter(Boolean)
        .join(" ");

      const verb = newStatus === "APPROVED" ? "approved" : newStatus === "DECLINED" ? "declined" : "";
      const notifMessage =
        notifType && verb
          ? `Your application for ${fullName || application.firstName} (Record #${application.recordNumber}) has been ${verb}.`
          : null;

      if (notifType && notifMessage) {
        // Always create a fresh notification per approve/decline action so
        // re-approvals after a customer re-edit also surface to the customer.
        try {
          await prisma.notification.create({
            data: {
              applicationId: application.id,
              type: notifType as any,
              message: notifMessage,
            },
          });
        } catch (notifErr) {
          console.error(
            `[PATCH /api/applications/${accountNumber}] failed to create ${notifType} notification`,
            notifErr,
          );
        }
      }
    }

    // For customer edits, store a before/after diff in ActivityLog.metadata (even if an admin session cookie exists)
    let customerDiff: Record<string, { before: string; after: string }> | null = null;
    if ((action === "edit" || !action) && source === "customer") {
      const diff = buildDiff(existing as any, filteredData as any);
      if (Object.keys(diff).length > 0) {
        customerDiff = diff;
        const customerUpdateReason =
          typeof (filteredData as any)?.customerUpdateReason === "string" && (filteredData as any).customerUpdateReason.trim()
            ? (filteredData as any).customerUpdateReason.trim()
            : null;
        await prisma.activityLog.create({
          data: {
            action: "APPLICATION_UPDATED",
            description: `Customer submitted updates: ${application.recordNumber}`,
            applicationId: application.id,
            metadata: {
              source: "customer",
              recordNumber: application.recordNumber,
              accountNumber: application.accountNumber,
              customerUpdateReason,
              diff: customerDiff,
            },
          },
        });
      }
    }

    if (customerDiff) {
      try {
        await notifyAdminCustomerSubmission(
          application.id,
          adminCustomerSubmissionMessage(application),
        );
      } catch (notifErr) {
        console.error(
          `[PATCH /api/applications/${accountNumber}] failed to create ADMIN_APPLICATION notification`,
          notifErr,
        );
      }
    }

    // Log the activity (only if the session user actually exists in the DB)
    if (logAction && sessionUserIsValid && session?.user) {
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
    console.error("Failed to update application", error);
    const message =
      error instanceof Error ? error.message : "Failed to update application";
    return NextResponse.json(
      { error: "Failed to update application", details: message },
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

// app/api/applications/route.ts - List and Create applications
import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function labelApplicationKind(appType: string): string {
  const u = appType?.toUpperCase();
  if (u === "NEW") return "new application";
  if (u === "CHANGE") return "transfer or change-of-service application";
  return appType;
}

function labelMembership(mt: string): string {
  const u = mt?.toUpperCase();
  if (u === "HOUSEHOLD") return "Household membership";
  if (u === "CORPORATE") return "Corporate membership";
  return mt;
}

/** Shared copy for admin bulletin (type ADMIN_APPLICATION). */
function adminApplicationBulletinMessage(app: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  appType: string;
  membership: string;
  accountNumber: string | null;
  recordNumber: string;
}): string {
  const fullName =
    [app.firstName, app.middleName, app.lastName].filter(Boolean).join(" ").trim() || app.firstName;
  const acctLabel = app.accountNumber?.trim() ? app.accountNumber : "account pending assignment";
  return `${fullName} has a ${labelApplicationKind(app.appType)} (${labelMembership(
    app.membership,
  )}) for their account (${acctLabel}). Record #${app.recordNumber}.`.slice(0, 500);
}

async function notifyAdminApplicationBulletin(applicationId: string, message: string) {
  await prisma.notification.create({
    data: {
      applicationId,
      type: NotificationType.ADMIN_APPLICATION,
      message,
      read: false,
    },
  });
}

/** Avoid duplicate bulletins when the customer refreshes and POST sync runs again within a short window. */
async function notifyAdminApplicationBulletinDeduped(
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
  await notifyAdminApplicationBulletin(applicationId, message);
}

/** Customer PENDING row — only if missing (existing-app sync path may never hit create()). */
async function ensureCustomerPendingNotification(app: { id: string; recordNumber: string }) {
  const exists = await prisma.notification.findFirst({
    where: { applicationId: app.id, type: NotificationType.PENDING },
    select: { id: true },
  });
  if (exists) return;
  const msg =
    `Your application (Record #${app.recordNumber}) is pending review. We'll notify you here when it's approved or declined.`.slice(
      0,
      500,
    );
  await prisma.notification.create({
    data: {
      applicationId: app.id,
      type: NotificationType.PENDING,
      message: msg,
      read: false,
    },
  });
}

// GET /api/applications - List all applications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const applications = await prisma.application.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json(applications);
  } catch (err) {
    console.error("[GET /api/applications]", err);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create new application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await auth();

    const createdByInclude = {
      createdBy: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    } as const;

    const fullInclude = {
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
    } as const;

    // 1) Look up by accountNumber (primary external key from FastAPI / customer portal)
    let existing = body.accountNumber
      ? await prisma.application.findUnique({
          // cast to any to support accountNumber unique lookup regardless of generated TypeScript helper
          where: { accountNumber: body.accountNumber } as any,
          include: createdByInclude,
        })
      : null;

    // 2) If not found by accountNumber, fall back to recordNumber. This handles the common case
    //    where a local row was seeded/created using only recordNumber (e.g. the seed script),
    //    and the customer is now entering via a different external accountNumber. Without this
    //    fallback, create() would throw P2002 on the unique recordNumber and subsequent PATCHes
    //    would 404 because no row exists under the new accountNumber.
    if (!existing && body.recordNumber) {
      const byRecord = await prisma.application.findUnique({
        where: { recordNumber: body.recordNumber },
        include: createdByInclude,
      });

      if (byRecord) existing = byRecord;
    }

    // If we already have an application:
    //   - Always reconcile the accountNumber (non-user-editable linkage between
    //     FastAPI and the local row) when one is provided.
    //   - Only sync the FastAPI customer snapshot (name/address/contact/etc.)
    //     into the row if the row has NEVER been touched by a customer edit.
    //     Once any customer-originated ActivityLog exists, the local DB is the
    //     source of truth for the applicant's work-in-progress edits and must
    //     not be overwritten by the FastAPI snapshot on subsequent page visits.
    if (existing) {
      const syncPayload: Record<string, any> = {};

      // Reconcile external accountNumber → existing row (safe, not user-edited).
      if (body.accountNumber && existing.accountNumber !== body.accountNumber) {
        syncPayload.accountNumber = body.accountNumber;
      }

      // Has the customer (or an admin action) ever modified this application?
      // We treat ANY activity log for this application as "dirty" so we don't
      // clobber pending edits, admin updates, or approve/decline context.
      const anyActivity = await prisma.activityLog.findFirst({
        where: { applicationId: existing.id },
        select: { id: true },
      });
      const isDirty = !!anyActivity;

      if (!isDirty) {
        // Whitelist of fields that POST /api/applications is allowed to
        // overwrite on a pristine row. These mirror what `mapApiToForm`
        // returns from the FastAPI customer snapshot. Workflow fields
        // (status, orNumber, dateIssued, approvedAt, declinedAt,
        // declineReason, notes, cosignatory, witness) are intentionally
        // excluded so we don't clobber admin actions.
        const syncableKeys = [
          "appType",
          "membership",
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
          "landline",
          "email",
          "privacyConsent",
          "privacyNewsletter",
          "privacyEmail",
          "privacySms",
          "privacyPhone",
          "privacySocial",
        ] as const;

        for (const key of syncableKeys) {
          const incoming = (body as Record<string, any>)[key];
          if (incoming === undefined) continue;
          // Avoid wiping a populated field with an empty string from the
          // external API – treat "" as "no value provided".
          if (typeof incoming === "string" && incoming.trim() === "") continue;
          const current = (existing as Record<string, any>)[key];
          if (incoming !== current) syncPayload[key] = incoming;
        }

        if (
          typeof body.notes === "string" &&
          body.notes.trim().length > 0 &&
          body.notes !== existing.notes
        ) {
          syncPayload.notes = body.notes;
        }
      }

      if (Object.keys(syncPayload).length === 0) {
        return NextResponse.json(existing, { status: 200 });
      }

      const updated = await prisma.application.update({
        where: { id: existing.id },
        data: syncPayload,
        include: fullInclude,
      });

      // Most customers already had a row from FastAPI/seed — POST hits this branch, not create().
      // Emit admin + customer PENDING after a real sync (dedupe rapid repeats on refresh).
      try {
        await notifyAdminApplicationBulletinDeduped(updated.id, adminApplicationBulletinMessage(updated));
        await ensureCustomerPendingNotification(updated);
      } catch (notifyErr) {
        console.error("[POST /api/applications] bulletin after sync failed:", notifyErr);
      }

      return NextResponse.json(updated, { status: 200 });
    }

    // Create application with user tracking if authenticated, otherwise unauthenticated
    const application = await prisma.application.create({
      data: {
        ...body,
        status: body.status || "PENDING",
        createdById: session?.user?.id || undefined,
        createdAt: new Date(),
        accountNumber: body.accountNumber,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    try {
      await notifyAdminApplicationBulletin(application.id, adminApplicationBulletinMessage(application));
      await ensureCustomerPendingNotification(application);
    } catch (notifyErr) {
      console.error("[POST /api/applications] bulletin on create failed:", notifyErr);
    }

    // Log the creation activity (only if authenticated)
    if (session?.user) {
      await prisma.activityLog.create({
        data: {
          action: "APPLICATION_CREATED",
          description: `Application created: ${application.recordNumber}`,
          applicationId: application.id,
          userId: session.user.id,
          userEmail: session.user.email || undefined,
          metadata: {
            recordNumber: application.recordNumber,
            firstName: application.firstName,
            lastName: application.lastName,
          },
        },
      });
    }

    return NextResponse.json(application, { status: 201 });
  } catch (err) {
    console.error("[POST /api/applications]", err);
    const message = err instanceof Error ? err.message : "Failed to create application";
    return NextResponse.json(
      { error: "Failed to create application", details: message },
      { status: 500 }
    );
  }
}

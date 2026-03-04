// app/api/applications/route.ts - List and Create applications
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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
  } catch {
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

    // Check if application already exists
    const existing = await prisma.application.findUnique({
      where: { accountNumber: body.accountNumber },
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

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
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
  } catch {
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}

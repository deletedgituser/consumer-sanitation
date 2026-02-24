// app/api/logs/route.ts - Get activity logs
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/logs - Get activity logs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const logs = await prisma.activityLog.findMany({
      where: applicationId ? { applicationId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

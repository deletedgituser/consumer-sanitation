// app/api/tickets/[id]/route.ts — admin: view / update a single ticket
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const ALLOWED_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;
type TicketStatusLiteral = (typeof ALLOWED_STATUSES)[number];

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        resolvedBy: { select: { id: true, name: true, username: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch (err) {
    console.error("GET /api/tickets/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch ticket." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: string;
      resolutionNote?: string | null;
    };

    const data: Record<string, unknown> = {};
    if (body.status) {
      if (!ALLOWED_STATUSES.includes(body.status as TicketStatusLiteral)) {
        return NextResponse.json(
          { error: "Invalid status." },
          { status: 400 }
        );
      }
      data.status = body.status;
      if (body.status === "RESOLVED" || body.status === "CLOSED") {
        data.resolvedAt = new Date();
        data.resolvedById = (session.user as { id?: string }).id ?? null;
      } else {
        data.resolvedAt = null;
        data.resolvedById = null;
      }
    }
    if (body.resolutionNote !== undefined) {
      data.resolutionNote = body.resolutionNote?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update." },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        resolvedBy: { select: { id: true, name: true, username: true } },
      },
    });

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("PATCH /api/tickets/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to update ticket." },
      { status: 500 }
    );
  }
}

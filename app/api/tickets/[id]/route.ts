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
      accountNumber?: string | null;
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
    if (body.accountNumber !== undefined) {
      const next =
        typeof body.accountNumber === "string"
          ? body.accountNumber.trim()
          : null;
      data.accountNumber = next && next.length > 0 ? next : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update." },
        { status: 400 }
      );
    }

    const existing = await prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        resolvedBy: { select: { id: true, name: true, username: true } },
      },
    });

    // Customer bell (INFO): show when ticket reaches In review / Resolved / Closed.
    const prevStatus = existing.status;
    const newStatus = ticket.status;
    if (
      body.status &&
      prevStatus !== newStatus &&
      ["IN_REVIEW", "RESOLVED", "CLOSED"].includes(newStatus) &&
      ticket.accountNumber
    ) {
      try {
        const application = await prisma.application.findUnique({
          where: { accountNumber: ticket.accountNumber },
          select: { id: true },
        });
        if (application) {
          let msg = "";
          if (newStatus === "IN_REVIEW") {
            msg =
              "Your support ticket is now in review. We'll contact you if needed.";
          } else if (newStatus === "RESOLVED") {
            msg = "Your support ticket has been resolved.";
          } else {
            msg = "Your support ticket has been closed.";
          }
          const ref = ` Ref ${ticket.id.slice(0, 8)}…`;
          await prisma.notification.create({
            data: {
              applicationId: application.id,
              type: "INFO",
              message: (msg + ref).slice(0, 500),
              read: false,
            },
          });
        }
      } catch (e) {
        console.error(
          "[PATCH /api/tickets/[id]] customer notification failed:",
          e
        );
      }
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("PATCH /api/tickets/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to update ticket." },
      { status: 500 }
    );
  }
}

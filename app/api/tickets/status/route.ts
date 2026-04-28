// GET /api/tickets/status — public: ticket summary when ticket belongs to account (customer view)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId")?.trim();
    const account = searchParams.get("account")?.trim();
    if (!ticketId || !account) {
      return NextResponse.json(
        { error: "ticketId and account are required." },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        status: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        accountNumber: true,
        resolutionNote: true,
      },
    });

    if (!ticket || ticket.accountNumber !== account) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const showResolution =
      ticket.status === "RESOLVED" || ticket.status === "CLOSED";

    return NextResponse.json({
      id: ticket.id,
      status: ticket.status,
      category: ticket.category,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolutionNote: showResolution ? ticket.resolutionNote : null,
    });
  } catch (err) {
    console.error("GET /api/tickets/status failed:", err);
    return NextResponse.json(
      { error: "Failed to load ticket." },
      { status: 500 }
    );
  }
}

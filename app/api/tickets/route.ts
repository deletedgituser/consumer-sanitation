// app/api/tickets/route.ts — create a support ticket (public) + list (admin)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const VALID_CATEGORIES = new Set([
  "ID_MISSPELLED",
  "NO_ID",
  "ID_IN_4PS",
  "OTHER",
]);

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB

const TICKET_CATEGORY_LABEL: Record<string, string> = {
  ID_MISSPELLED: "ID misspelled",
  NO_ID: "No ID",
  ID_IN_4PS: "ID in 4Ps",
  OTHER: "Other",
};

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  return base || "upload";
}

/** Save an uploaded File to /public/uploads/tickets and return its web path. */
async function saveAttachment(file: File): Promise<{ url: string; name: string } | null> {
  if (!file || typeof file === "string") return null;
  const size = (file as unknown as { size?: number }).size ?? 0;
  if (!size) return null;
  if (size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment exceeds 8 MB limit.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const originalName = sanitizeFilename(file.name || "upload");
  const ext = path.extname(originalName) || "";
  const stored = `${randomUUID()}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "tickets");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, stored), bytes);

  return { url: `/uploads/tickets/${stored}`, name: originalName };
}

/**
 * POST /api/tickets — PUBLIC
 * Accepts multipart/form-data with: name, address, location, phoneNumber,
 * category, accountNumber (optional), message (required, min 10 chars), attachment (File).
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data request." },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const name = String(form.get("name") || "").trim();
    const address = String(form.get("address") || "").trim();
    const location = String(form.get("location") || "").trim();
    const phoneNumber = String(form.get("phoneNumber") || "").trim();
    const category = String(form.get("category") || "").trim();
    const accountNumber =
      String(form.get("accountNumber") || "").trim() || null;
    const message = String(form.get("message") || "").trim();

    if (!name || !address || !phoneNumber || !category) {
      return NextResponse.json(
        { error: "Name, address, phone number and category are required." },
        { status: 400 }
      );
    }
    if (message.length < 10) {
      return NextResponse.json(
        { error: "Additional notes must be at least 10 characters." },
        { status: 400 }
      );
    }
    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: "Invalid ticket category." },
        { status: 400 }
      );
    }

    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      return NextResponse.json(
        { error: "Phone number looks invalid." },
        { status: 400 }
      );
    }

    const raw = form.get("attachment");
    let attachment: { url: string; name: string } | null = null;
    if (raw && typeof raw !== "string") {
      attachment = await saveAttachment(raw as File);
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        name,
        address,
        location: location || null,
        phoneNumber,
        category: category as
          | "ID_MISSPELLED"
          | "NO_ID"
          | "ID_IN_4PS"
          | "OTHER",
        accountNumber,
        message,
        attachmentUrl: attachment?.url ?? null,
        attachmentName: attachment?.name ?? null,
      },
    });

    // Notify admins (global notification feed): link to local application when account exists.
    // Type PENDING is shown in admin bell and excluded from customer notification list.
    if (accountNumber) {
      try {
        const application = await prisma.application.findUnique({
          where: { accountNumber },
          select: { id: true },
        });
        if (application) {
          const catLabel = TICKET_CATEGORY_LABEL[category] ?? category;
          // Machine-readable suffix so admin UI can open Tickets instead of the application record.
          const token = `[ticket:${ticket.id}]`;
          const human = `New support ticket (${catLabel}): ${name} · ${phoneNumber}.`;
          let summary = `${human} ${token}`;
          if (summary.length > 500) {
            const room = Math.max(0, 500 - token.length - 1);
            summary = `${human.slice(0, room).trim()} ${token}`.slice(0, 500);
          }
          await prisma.notification.create({
            data: {
              applicationId: application.id,
              type: "PENDING",
              message: summary,
              read: false,
            },
          });
        }
      } catch (e) {
        console.error("[POST /api/tickets] admin notification failed:", e);
      }
    }

    return NextResponse.json(
      { id: ticket.id, status: ticket.status, createdAt: ticket.createdAt },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to submit ticket.";
    console.error("POST /api/tickets failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/tickets — ADMIN ONLY
 * Optional query: status=OPEN|IN_REVIEW|RESOLVED|CLOSED, q (name/account search)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10) || 100,
      500
    );

    const where: Record<string, unknown> = {};
    if (
      status &&
      ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"].includes(status)
    ) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { accountNumber: { contains: q } },
        { phoneNumber: { contains: q } },
      ];
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        resolvedBy: { select: { id: true, name: true, username: true } },
      },
    });

    return NextResponse.json(tickets);
  } catch (err) {
    console.error("GET /api/tickets failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch tickets." },
      { status: 500 }
    );
  }
}

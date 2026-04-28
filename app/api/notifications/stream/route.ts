import { NextRequest } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sseFormat(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// GET /api/notifications/stream - SSE stream for unread notifications (admin)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since"); // ISO timestamp
  let since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60_000);
  if (Number.isNaN(since.getTime())) since = new Date(Date.now() - 60_000);

  let cancelStream = () => {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let cleanedUp = false;

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        closed = true;
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", handleAbort);
        try {
          controller.close();
        } catch {
          // ignore double-close/cancel races
        }
      };
      cancelStream = cleanup;

      const safeEnqueue = (payload: string) => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(payload));
          return true;
        } catch {
          cleanup();
          return false;
        }
      };

      const handleAbort = () => {
        cleanup();
      };

      const heartbeat = setInterval(() => {
        void safeEnqueue(`event: ping\ndata: {}\n\n`);
      }, 15_000);

      request.signal.addEventListener("abort", handleAbort);

      try {
        // initial hello
        if (!safeEnqueue(sseFormat("ready", { since: since.toISOString() }))) return;

        while (!closed) {
          const notifications = await prisma.notification.findMany({
            where: {
              type: {
                in: [NotificationType.ADMIN_APPLICATION, NotificationType.ADMIN_TICKET],
              },
              read: false,
              createdAt: { gt: since },
            },
            orderBy: { createdAt: "asc" },
            take: 50,
            include: {
              application: {
                select: {
                  id: true,
                  accountNumber: true,
                  recordNumber: true,
                  firstName: true,
                  lastName: true,
                  status: true,
                  createdAt: true,
                },
              },
            },
          });

          if (closed || request.signal.aborted) {
            cleanup();
            break;
          }

          if (notifications.length > 0) {
            // advance cursor to last item
            const last = notifications[notifications.length - 1];
            since = new Date(last.createdAt);

            if (
              !safeEnqueue(
                sseFormat("notification", {
                  notifications,
                  since: since.toISOString(),
                })
              )
            ) {
              break;
            }
          }

          await sleep(2000);
        }
      } catch (err) {
        if (!closed) {
          void safeEnqueue(
            sseFormat("error", { message: err instanceof Error ? err.message : "stream error" })
          );
        }
      } finally {
        cleanup();
      }
    },
    cancel() {
      cancelStream();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}


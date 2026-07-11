import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { getVisitorStreamHub } from "@/lib/visitors/stream-hub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 25_000;

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const GET = withAuth(async (request: NextRequest) => {
  const hub = getVisitorStreamHub();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let unsubscribe: (() => void) | null = null;

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseFrame(event, data)));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        unsubscribe?.();
        unsubscribe = null;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      send("connected", { ok: true, live: hub.isSupported() });

      unsubscribe = hub.subscribe((event) => {
        if (event.type === "visitor") {
          send("visitor", { visitor: event.visitor });
        } else if (event.type === "deleted") {
          send("deleted", { id: event.id });
        } else if (event.type === "error") {
          send("error", { message: event.message });
          cleanup();
        }
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_MS);

      request.signal.addEventListener("abort", cleanup);
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
}, PERMISSIONS.ANALYTICS_READ);

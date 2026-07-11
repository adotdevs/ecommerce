import type { VisitorStreamEvent, VisitorStreamRecord } from "@/lib/visitors/stream-types";

function parseSseChunk(chunk: string): VisitorStreamEvent[] {
  const events: VisitorStreamEvent[] = [];
  const blocks = chunk.split("\n\n");

  for (const block of blocks) {
    if (!block.trim() || block.startsWith(":")) continue;

    let eventType = "message";
    let data = "";

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (!data) continue;

    try {
      const payload = JSON.parse(data) as Record<string, unknown>;
      if (eventType === "connected") {
        events.push({ type: "connected" });
      } else if (eventType === "visitor" && payload.visitor) {
        events.push({
          type: "visitor",
          visitor: payload.visitor as VisitorStreamRecord,
        });
      } else if (eventType === "deleted" && payload.id) {
        events.push({ type: "deleted", id: String(payload.id) });
      } else if (eventType === "error") {
        events.push({
          type: "error",
          message: String(payload.message ?? "Stream error"),
        });
      }
    } catch {
      // ignore malformed frames
    }
  }

  return events;
}

export interface VisitorSseConnection {
  close: () => void;
}

export function connectVisitorSse(
  accessToken: string,
  onEvent: (event: VisitorStreamEvent) => void,
  onDisconnect?: () => void
): VisitorSseConnection {
  const controller = new AbortController();
  let buffer = "";
  let closed = false;

  const run = async () => {
    try {
      const res = await fetch("/api/v1/admin/visitors/stream", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok || !res.body) {
        onEvent({
          type: "error",
          message: `Stream unavailable (${res.status})`,
        });
        onDisconnect?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lastBreak = buffer.lastIndexOf("\n\n");
        if (lastBreak === -1) continue;

        const chunk = buffer.slice(0, lastBreak + 2);
        buffer = buffer.slice(lastBreak + 2);

        for (const event of parseSseChunk(chunk)) {
          onEvent(event);
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      onEvent({
        type: "error",
        message: error instanceof Error ? error.message : "Stream disconnected",
      });
    } finally {
      if (!controller.signal.aborted) {
        onDisconnect?.();
      }
    }
  };

  void run();

  return {
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}

import { connectDB } from "@/lib/db/mongoose";
import { VisitorLog } from "@/models";
import type { VisitorStreamEvent, VisitorStreamRecord } from "@/lib/visitors/stream-types";

type Listener = (event: VisitorStreamEvent) => void;
type MongoChangeStream = Awaited<ReturnType<typeof VisitorLog.watch>>;

function toStreamRecord(doc: Record<string, unknown>): VisitorStreamRecord {
  const visitedAt = doc.visitedAt;
  return {
    _id: String(doc._id),
    ip: doc.ip as string | undefined,
    geo: doc.geo as VisitorStreamRecord["geo"],
    landingPath: doc.landingPath as string | undefined,
    referrer: doc.referrer as string | undefined,
    userAgent: String(doc.userAgent ?? ""),
    browser: doc.browser as string | undefined,
    os: doc.os as string | undefined,
    device: doc.device as string | undefined,
    language: doc.language as string | undefined,
    acceptLanguage: doc.acceptLanguage as string | undefined,
    screen: doc.screen as string | undefined,
    viewport: doc.viewport as string | undefined,
    timezone: doc.timezone as string | undefined,
    platform: doc.platform as string | undefined,
    telegramSent: Boolean(doc.telegramSent),
    visitedAt:
      visitedAt instanceof Date
        ? visitedAt.toISOString()
        : typeof visitedAt === "string"
          ? visitedAt
          : new Date().toISOString(),
  };
}

class VisitorStreamHub {
  private listeners = new Set<Listener>();
  private stream: MongoChangeStream | null = null;
  private starting: Promise<void> | null = null;
  private supported = true;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    void this.ensureStream();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        void this.closeStream();
      }
    };
  }

  isSupported() {
    return this.supported;
  }

  private emit(event: VisitorStreamEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private async ensureStream() {
    if (this.stream || this.starting || !this.supported) return;
    this.starting = this.openStream();
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  private async openStream() {
    try {
      await connectDB();
      const stream = VisitorLog.watch(
        [{ $match: { operationType: { $in: ["insert", "delete"] } } }],
        { fullDocument: "whenAvailable" }
      );

      stream.on("change", (change) => {
        if (change.operationType === "insert" && change.fullDocument) {
          this.emit({
            type: "visitor",
            visitor: toStreamRecord(
              change.fullDocument as unknown as Record<string, unknown>
            ),
          });
          return;
        }

        if (change.operationType === "delete") {
          const id = change.documentKey?._id;
          if (id) {
            this.emit({ type: "deleted", id: String(id) });
          }
        }
      });

      stream.on("error", (error: Error) => {
        console.error("[visitor-stream] change stream error:", error);
        this.supported = false;
        this.emit({
          type: "error",
          message: error.message || "Change stream unavailable",
        });
        void this.closeStream();
      });

      this.stream = stream;
    } catch (error) {
      this.supported = false;
      const message =
        error instanceof Error ? error.message : "Change stream unavailable";
      console.error("[visitor-stream] failed to start:", message);
      this.emit({ type: "error", message });
    }
  }

  private async closeStream() {
    if (!this.stream) return;
    try {
      await this.stream.close();
    } catch {
      // ignore close errors
    }
    this.stream = null;
  }
}

const globalForHub = globalThis as typeof globalThis & {
  __visitorStreamHub?: VisitorStreamHub;
};

export function getVisitorStreamHub() {
  if (!globalForHub.__visitorStreamHub) {
    globalForHub.__visitorStreamHub = new VisitorStreamHub();
  }
  return globalForHub.__visitorStreamHub;
}

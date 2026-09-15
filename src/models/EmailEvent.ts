import { Schema, type Connection, type Document, type Model } from "mongoose";
import { connectLeadsDB } from "@/lib/db/leads-mongoose";

export type EmailEventType =
  | "CREATED"
  | "AI_GENERATED"
  | "EDITED"
  | "APPROVED"
  | "QUEUED"
  | "PROCESSING_STARTED"
  | "SEND_ATTEMPTED"
  | "SENT"
  | "FAILED"
  | "RETRY_SCHEDULED"
  | "RETRIED"
  | "CANCELLED"
  | "SUPPRESSED"
  | "UNSUBSCRIBED"
  | "CLICKED"
  | "CONVERTED"
  | "SETTINGS_UPDATED"
  | "PAUSED"
  | "RESUMED"
  | "DELETED";

export interface IEmailEvent extends Document {
  campaignId?: any;
  emailMessageId?: any;
  leadId?: any;
  recipientEmail?: string;
  type: EmailEventType;
  actor: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const EmailEventSchema = new Schema<IEmailEvent>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "EmailCampaign", index: true },
    emailMessageId: { type: Schema.Types.ObjectId, ref: "EmailMessage", index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    recipientEmail: { type: String, lowercase: true, trim: true, index: true },
    type: { type: String, required: true, index: true },
    actor: { type: String, required: true, trim: true, default: "system" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EmailEventSchema.index({ type: 1, createdAt: -1 });

export type EmailEventModel = Model<IEmailEvent>;

export async function getEmailEventModel(): Promise<EmailEventModel> {
  const conn: Connection = await connectLeadsDB();
  return (
    (conn.models.EmailEvent as EmailEventModel) ??
    conn.model<IEmailEvent>("EmailEvent", EmailEventSchema)
  );
}

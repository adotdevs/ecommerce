import { Schema, type Connection, type Document, type Model } from "mongoose";
import { connectLeadsDB } from "@/lib/db/leads-mongoose";

export type MessageStatus =
  | "DRAFT"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "RETRYING"
  | "CANCELLED"
  | "SUPPRESSED"
  | "BLOCKED";

export interface IEmailMessage extends Document {
  campaignId?: Schema.Types.ObjectId | string;
  leadId: Schema.Types.ObjectId | string;
  recipientEmail: string;
  recipientName?: string;
  productId?: string;
  subjectSnapshot: string;
  previewTextSnapshot?: string;
  headlineSnapshot?: string;
  bodySnapshot: string;
  renderedHtmlSnapshot: string;
  renderedPlainTextSnapshot: string;
  ctaTextSnapshot?: string;
  ctaUrlSnapshot?: string;
  personalizationSnapshot?: Record<string, string>;
  productSnapshot?: Record<string, unknown>;
  emailDocumentSnapshot?: Record<string, unknown>;
  status: MessageStatus;
  lockToken?: string;
  queuedAt?: Date;
  processingStartedAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  suppressedAt?: Date;
  lastAttemptAt?: Date;
  totalAttempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  providerMessageId?: string;
  trackingToken: string;
  idempotencyKey: string;
  openedAt?: Date;
  clickedAt?: Date;
  failureCategory?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailMessageSchema = new Schema<IEmailMessage>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "EmailCampaign", index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    recipientName: { type: String, trim: true },
    productId: { type: String, trim: true },
    subjectSnapshot: { type: String, required: true },
    previewTextSnapshot: { type: String },
    headlineSnapshot: { type: String },
    bodySnapshot: { type: String, required: true },
    renderedHtmlSnapshot: { type: String, required: true },
    renderedPlainTextSnapshot: { type: String, required: true },
    ctaTextSnapshot: { type: String },
    ctaUrlSnapshot: { type: String },
    personalizationSnapshot: { type: Schema.Types.Mixed },
    productSnapshot: { type: Schema.Types.Mixed },
    emailDocumentSnapshot: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "QUEUED",
        "PROCESSING",
        "SENT",
        "FAILED",
        "RETRYING",
        "CANCELLED",
        "SUPPRESSED",
        "BLOCKED",
      ],
      default: "QUEUED",
      index: true,
    },
    lockToken: { type: String },
    queuedAt: { type: Date, default: Date.now, index: true },
    processingStartedAt: { type: Date },
    sentAt: { type: Date, index: true },
    failedAt: { type: Date },
    cancelledAt: { type: Date },
    suppressedAt: { type: Date },
    lastAttemptAt: { type: Date },
    totalAttempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextRetryAt: { type: Date, index: true },
    providerMessageId: { type: String },
    trackingToken: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, required: true, unique: true },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    failureCategory: { type: String },
    failureReason: { type: String },
  },
  { timestamps: true }
);

EmailMessageSchema.index({ campaignId: 1, status: 1 });
EmailMessageSchema.index({ leadId: 1, createdAt: -1 });
EmailMessageSchema.index({ status: 1, nextRetryAt: 1 });
EmailMessageSchema.index({ status: 1, queuedAt: 1 });

export type EmailMessageModel = Model<IEmailMessage>;

export async function getEmailMessageModel(): Promise<EmailMessageModel> {
  const conn: Connection = await connectLeadsDB();
  return (
    (conn.models.EmailMessage as EmailMessageModel) ??
    conn.model<IEmailMessage>("EmailMessage", EmailMessageSchema)
  );
}

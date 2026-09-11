import { Schema, type Connection, type Document, type Model } from "mongoose";
import { connectLeadsDB } from "@/lib/db/leads-mongoose";

export type SmtpErrorCategory =
  | "AUTHENTICATION"
  | "CONNECTION"
  | "TIMEOUT"
  | "INVALID_RECIPIENT"
  | "RECIPIENT_REJECTED"
  | "MAILBOX_NOT_FOUND"
  | "RATE_LIMIT"
  | "TEMPORARY_PROVIDER_ERROR"
  | "PERMANENT_PROVIDER_ERROR"
  | "CONFIGURATION"
  | "CONTENT"
  | "UNKNOWN";

export interface IEmailAttempt extends Document {
  emailMessageId: any;
  campaignId?: any;
  leadId?: any;
  attemptNumber: number;
  startedAt: Date;
  finishedAt: Date;
  success: boolean;
  providerResponse?: string;
  providerMessageId?: string;
  smtpCode?: number;
  errorCategory?: SmtpErrorCategory;
  sanitizedError?: string;
  retryable: boolean;
  durationMs?: number;
  createdAt: Date;
}

const EmailAttemptSchema = new Schema<IEmailAttempt>(
  {
    emailMessageId: {
      type: Schema.Types.ObjectId,
      ref: "EmailMessage",
      required: true,
      index: true,
    },
    campaignId: { type: Schema.Types.ObjectId, ref: "EmailCampaign", index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    attemptNumber: { type: Number, required: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: Date.now },
    success: { type: Boolean, required: true, index: true },
    providerResponse: { type: String },
    providerMessageId: { type: String },
    smtpCode: { type: Number },
    errorCategory: {
      type: String,
      enum: [
        "AUTHENTICATION",
        "CONNECTION",
        "TIMEOUT",
        "INVALID_RECIPIENT",
        "RECIPIENT_REJECTED",
        "MAILBOX_NOT_FOUND",
        "RATE_LIMIT",
        "TEMPORARY_PROVIDER_ERROR",
        "PERMANENT_PROVIDER_ERROR",
        "CONFIGURATION",
        "CONTENT",
        "UNKNOWN",
      ],
    },
    sanitizedError: { type: String },
    retryable: { type: Boolean, default: false },
    durationMs: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EmailAttemptSchema.index({ emailMessageId: 1, attemptNumber: 1 });

export type EmailAttemptModel = Model<IEmailAttempt>;

export async function getEmailAttemptModel(): Promise<EmailAttemptModel> {
  const conn: Connection = await connectLeadsDB();
  return (
    (conn.models.EmailAttempt as EmailAttemptModel) ??
    conn.model<IEmailAttempt>("EmailAttempt", EmailAttemptSchema)
  );
}

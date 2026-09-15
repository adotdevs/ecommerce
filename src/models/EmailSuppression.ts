import { Schema, type Connection, type Document, type Model } from "mongoose";
import { connectLeadsDB } from "@/lib/db/leads-mongoose";

export type SuppressionReason =
  | "UNSUBSCRIBED"
  | "HARD_FAILURE"
  | "INVALID_EMAIL"
  | "MANUAL_BLOCK"
  | "COMPLAINT"
  | "OTHER";

export interface IEmailSuppression extends Document {
  email: string;
  leadId?: Schema.Types.ObjectId | string;
  reason: SuppressionReason;
  source: string;
  blockedAt: Date;
  blockedBy?: string;
  isPermanent: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSuppressionSchema = new Schema<IEmailSuppression>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    reason: {
      type: String,
      enum: [
        "UNSUBSCRIBED",
        "HARD_FAILURE",
        "INVALID_EMAIL",
        "MANUAL_BLOCK",
        "COMPLAINT",
        "OTHER",
      ],
      default: "UNSUBSCRIBED",
      index: true,
    },
    source: { type: String, required: true, trim: true },
    blockedAt: { type: Date, default: Date.now },
    blockedBy: { type: String, trim: true },
    isPermanent: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export type EmailSuppressionModel = Model<IEmailSuppression>;

export async function getEmailSuppressionModel(): Promise<EmailSuppressionModel> {
  const conn: Connection = await connectLeadsDB();
  return (
    (conn.models.EmailSuppression as EmailSuppressionModel) ??
    conn.model<IEmailSuppression>("EmailSuppression", EmailSuppressionSchema)
  );
}

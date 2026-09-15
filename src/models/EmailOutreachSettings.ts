import { Schema, type Connection, type Document, type Model } from "mongoose";
import { connectLeadsDB } from "@/lib/db/leads-mongoose";

export interface IEmailOutreachSettings extends Document {
  key: string;
  dailyLimit: number;
  hourlyLimit?: number;
  cooldownDays: number;
  maxRetries: number;
  retryDelayMinutes: number;
  defaultSenderName: string;
  defaultSenderEmail: string;
  defaultReplyTo: string;
  defaultFooterCopy?: string;
  companyAddress?: string;
  defaultTestRecipient?: string;
  defaultUtmSource: string;
  defaultUtmMedium: string;
  isAiAssistanceEnabled: boolean;
  isMarketingPaused: boolean;
  pausedAt?: Date;
  pausedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailOutreachSettingsSchema = new Schema<IEmailOutreachSettings>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    dailyLimit: { type: Number, default: 10, min: 1 },
    hourlyLimit: { type: Number, default: 0 },
    cooldownDays: { type: Number, default: 14, min: 0 },
    maxRetries: { type: Number, default: 2, min: 0, max: 5 },
    retryDelayMinutes: { type: Number, default: 30, min: 1 },
    defaultSenderName: { type: String, default: "Findora Store", trim: true },
    defaultSenderEmail: { type: String, default: "shop@findora.market", trim: true },
    defaultReplyTo: { type: String, default: "support@findora.market", trim: true },
    defaultFooterCopy: {
      type: String,
      default: "You received this email because you subscribed to updates from Findora.",
    },
    companyAddress: { type: String, default: "Findora Market, 100 Market St." },
    defaultTestRecipient: { type: String, trim: true },
    defaultUtmSource: { type: String, default: "email", trim: true },
    defaultUtmMedium: { type: String, default: "campaign", trim: true },
    isAiAssistanceEnabled: { type: Boolean, default: true },
    isMarketingPaused: { type: Boolean, default: false },
    pausedAt: { type: Date },
    pausedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export type EmailOutreachSettingsModel = Model<IEmailOutreachSettings>;

export async function getEmailOutreachSettingsModel(): Promise<EmailOutreachSettingsModel> {
  const conn: Connection = await connectLeadsDB();
  return (
    (conn.models.EmailOutreachSettings as EmailOutreachSettingsModel) ??
    conn.model<IEmailOutreachSettings>("EmailOutreachSettings", EmailOutreachSettingsSchema)
  );
}

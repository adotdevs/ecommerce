import { Schema, type Connection, type Document, type Model } from "mongoose";
import { connectLeadsDB } from "@/lib/db/leads-mongoose";

export type CampaignStatus =
  | "DRAFT"
  | "READY"
  | "SCHEDULED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_FAILED"
  | "FAILED"
  | "PAUSED"
  | "CANCELLED";

export interface IEmailCampaign extends Document {
  name: string;
  internalDescription?: string;
  objective?: string;
  campaignBrief?: string;
  productId?: string;
  productSnapshot?: {
    name?: string;
    slug?: string;
    price?: number;
    salePrice?: number;
    image?: string;
    description?: string;
  };
  /** Structured email document for visual builder */
  emailDocument?: Record<string, unknown>;
  emailDocumentVersion?: number;
  templateId?: string;
  status: CampaignStatus;
  audienceFilterSnapshot?: Record<string, unknown>;
  audienceCount: number;
  eligibleCount: number;
  excludedCount: number;
  queuedCount: number;
  processingCount: number;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  cancelledCount: number;
  clickCount: number;
  orderCount: number;
  attributedRevenue: number;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  subject: string;
  previewText?: string;
  headline?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  couponCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  lastFailureReason?: string;
  lastFailureCategory?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailCampaignSchema = new Schema<IEmailCampaign>(
  {
    name: { type: String, required: true, trim: true },
    internalDescription: { type: String, trim: true },
    objective: { type: String, trim: true, default: "general_promotion" },
    campaignBrief: { type: String, trim: true },
    productId: { type: String, trim: true },
    productSnapshot: {
      name: String,
      slug: String,
      price: Number,
      salePrice: Number,
      image: String,
      description: String,
    },
    emailDocument: { type: Schema.Types.Mixed },
    emailDocumentVersion: { type: Number, default: 0 },
    templateId: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "READY",
        "SCHEDULED",
        "QUEUED",
        "PROCESSING",
        "COMPLETED",
        "PARTIALLY_FAILED",
        "FAILED",
        "PAUSED",
        "CANCELLED",
      ],
      default: "DRAFT",
      index: true,
    },
    audienceFilterSnapshot: { type: Schema.Types.Mixed },
    audienceCount: { type: Number, default: 0 },
    eligibleCount: { type: Number, default: 0 },
    excludedCount: { type: Number, default: 0 },
    queuedCount: { type: Number, default: 0 },
    processingCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    suppressedCount: { type: Number, default: 0 },
    cancelledCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    attributedRevenue: { type: Number, default: 0 },
    senderName: { type: String, trim: true },
    senderEmail: { type: String, trim: true },
    replyTo: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    previewText: { type: String, trim: true },
    headline: { type: String, trim: true },
    body: { type: String, required: true },
    ctaText: { type: String, trim: true },
    ctaUrl: { type: String, trim: true },
    couponCode: { type: String, trim: true },
    utmSource: { type: String, trim: true, default: "email" },
    utmMedium: { type: String, trim: true, default: "campaign" },
    utmCampaign: { type: String, trim: true },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    lastFailureReason: { type: String, trim: true },
    lastFailureCategory: { type: String, trim: true },
    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

EmailCampaignSchema.index({ status: 1, createdAt: -1 });
EmailCampaignSchema.index({ scheduledAt: 1 });

export type EmailCampaignModel = Model<IEmailCampaign>;

export async function getEmailCampaignModel(): Promise<EmailCampaignModel> {
  const conn: Connection = await connectLeadsDB();
  return (
    (conn.models.EmailCampaign as EmailCampaignModel) ??
    conn.model<IEmailCampaign>("EmailCampaign", EmailCampaignSchema)
  );
}

import { Schema, type Connection, type Document, type Model } from "mongoose";
import { connectLeadsDB } from "@/lib/db/leads-mongoose";

export interface IEmailTemplate extends Document {
  name: string;
  templateType: "visual" | "simple";
  category: string;
  description?: string;
  tags?: string[];
  version: number;
  subjectTemplate: string;
  previewTextTemplate?: string;
  headlineTemplate?: string;
  bodyTemplate: string;
  ctaTemplate?: string;
  ctaUrlTemplate?: string;
  footerConfig?: Record<string, unknown>;
  emailDocument?: Record<string, unknown>;
  translations?: Record<string, unknown>;
  previewHtml?: string;
  isActive: boolean;
  isArchived: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: { type: String, required: true, trim: true },
    templateType: {
      type: String,
      enum: ["visual", "simple"],
      default: "visual",
      index: true,
    },
    category: { type: String, required: true, trim: true, default: "general_promotion" },
    description: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    version: { type: Number, default: 1 },
    subjectTemplate: { type: String, required: true },
    previewTextTemplate: { type: String },
    headlineTemplate: { type: String },
    bodyTemplate: { type: String, default: "" },
    ctaTemplate: { type: String },
    ctaUrlTemplate: { type: String },
    footerConfig: { type: Schema.Types.Mixed },
    emailDocument: { type: Schema.Types.Mixed },
    translations: { type: Schema.Types.Mixed },
    previewHtml: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true }
);

EmailTemplateSchema.index({ category: 1, isActive: 1 });
EmailTemplateSchema.index({ templateType: 1, isActive: 1 });

export type EmailTemplateModel = Model<IEmailTemplate>;

export async function getEmailTemplateModel(): Promise<EmailTemplateModel> {
  const conn: Connection = await connectLeadsDB();
  return (
    (conn.models.EmailTemplate as EmailTemplateModel) ??
    conn.model<IEmailTemplate>("EmailTemplate", EmailTemplateSchema)
  );
}

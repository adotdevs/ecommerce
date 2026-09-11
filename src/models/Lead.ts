import { Schema, type Connection, type Document, type Model } from "mongoose";
import { connectLeadsDB } from "@/lib/db/leads-mongoose";

export interface ILead extends Document {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** ISO country derived from phone dial code */
  phoneCountry?: string;
  phoneDialCode?: string;
  /** Digit count of normalized phone */
  phoneLength?: number;
  country?: string;
  brand?: string;
  address?: string;
  status?: string;
  agent?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  importBatchId?: string;
  /** Extra mapped/unmapped fields kept for reference */
  meta?: Record<string, unknown>;
  /** Marketing email summary fields */
  emailSentCount?: number;
  lastEmailSentAt?: Date;
  lastEmailStatus?: string;
  firstEmailSentAt?: Date;
  lastCampaignId?: string;
  isSuppressed?: boolean;
  suppressionReason?: string;
  cooldownUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    phoneCountry: { type: String, trim: true, uppercase: true },
    phoneDialCode: { type: String, trim: true },
    phoneLength: { type: Number, min: 0 },
    country: { type: String, trim: true },
    brand: { type: String, trim: true },
    address: { type: String, trim: true },
    status: { type: String, trim: true, default: "New" },
    agent: { type: String, trim: true },
    notes: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    source: { type: String, trim: true },
    importBatchId: { type: String, trim: true, index: true },
    meta: { type: Schema.Types.Mixed },
    emailSentCount: { type: Number, default: 0, min: 0 },
    lastEmailSentAt: { type: Date },
    lastEmailStatus: { type: String, trim: true },
    firstEmailSentAt: { type: Date },
    lastCampaignId: { type: String, trim: true },
    isSuppressed: { type: Boolean, default: false },
    suppressionReason: { type: String, trim: true },
    cooldownUntil: { type: Date },
  },
  { timestamps: true }
);

LeadSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string", $gt: "" } },
  }
);
LeadSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phone: { $type: "string", $gt: "" } },
  }
);
LeadSchema.index({ country: 1, status: 1, createdAt: -1 });
LeadSchema.index({ brand: 1 });
LeadSchema.index({ phoneCountry: 1, phoneLength: 1 });
LeadSchema.index({ phoneDialCode: 1 });
LeadSchema.index({ emailSentCount: 1 });
LeadSchema.index({ lastEmailSentAt: -1 });
LeadSchema.index({ isSuppressed: 1 });
LeadSchema.index({ cooldownUntil: 1 });
LeadSchema.index({ isSuppressed: 1, emailSentCount: 1, lastEmailSentAt: 1 });

export type LeadModel = Model<ILead>;

export async function getLeadModel(): Promise<LeadModel> {
  const conn: Connection = await connectLeadsDB();
  return (conn.models.Lead as LeadModel) ?? conn.model<ILead>("Lead", LeadSchema);
}

export {
  LEAD_TARGET_FIELDS,
  type LeadTargetField,
} from "@/lib/leads/fields";

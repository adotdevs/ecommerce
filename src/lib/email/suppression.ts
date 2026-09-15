import { getEmailSuppressionModel, type SuppressionReason } from "@/models/EmailSuppression";
import { getLeadModel } from "@/models/Lead";
import { getEmailEventModel } from "@/models/EmailEvent";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isEmailSuppressed(email: string): Promise<{ suppressed: boolean; reason?: string }> {
  if (!email) return { suppressed: true, reason: "INVALID_EMAIL" };
  const normalized = normalizeEmail(email);
  const SuppressionModel = await getEmailSuppressionModel();
  const found = await SuppressionModel.findOne({ email: normalized }).lean();
  if (found) {
    return { suppressed: true, reason: found.reason };
  }
  return { suppressed: false };
}

export async function suppressEmail(params: {
  email: string;
  reason: SuppressionReason;
  source: string;
  actor?: string;
  notes?: string;
  leadId?: string;
}): Promise<void> {
  const normalized = normalizeEmail(params.email);
  if (!normalized) return;

  const SuppressionModel = await getEmailSuppressionModel();
  const LeadModel = await getLeadModel();
  const EventModel = await getEmailEventModel();

  await SuppressionModel.findOneAndUpdate(
    { email: normalized },
    {
      $set: {
        reason: params.reason,
        source: params.source,
        blockedAt: new Date(),
        blockedBy: params.actor || "system",
        notes: params.notes,
        ...(params.leadId ? { leadId: params.leadId } : {}),
      },
    },
    { upsert: true, new: true }
  );

  // Sync to Lead records with this email
  await LeadModel.updateMany(
    { email: normalized },
    {
      $set: {
        isSuppressed: true,
        suppressionReason: params.reason,
      },
    }
  );

  await EventModel.create({
    recipientEmail: normalized,
    leadId: params.leadId,
    type: params.reason === "UNSUBSCRIBED" ? "UNSUBSCRIBED" : "SUPPRESSED",
    actor: params.actor || "system",
    metadata: { reason: params.reason, source: params.source, notes: params.notes },
  });
}

export async function unsuppressEmail(email: string, actor: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const SuppressionModel = await getEmailSuppressionModel();
  const LeadModel = await getLeadModel();
  const EventModel = await getEmailEventModel();

  await SuppressionModel.deleteOne({ email: normalized });

  await LeadModel.updateMany(
    { email: normalized },
    {
      $set: {
        isSuppressed: false,
        suppressionReason: undefined,
      },
    }
  );

  await EventModel.create({
    recipientEmail: normalized,
    type: "APPROVED",
    actor,
    metadata: { action: "unsuppressed" },
  });
}

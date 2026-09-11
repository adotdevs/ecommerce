import { type ILead, getLeadModel } from "@/models/Lead";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { isEmailSuppressed, normalizeEmail } from "./suppression";
import { getEmailSettings } from "./settings";
import type { EligibilityResult } from "./types";

export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmailSyntax(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim());
}

export async function checkLeadEligibility(
  lead: Partial<ILead> & { _id?: unknown },
  options?: { ignoreCooldown?: boolean; campaignId?: string }
): Promise<EligibilityResult> {
  const reasons: string[] = [];
  const settings = await getEmailSettings();

  if (settings.isMarketingPaused) {
    reasons.push("MARKETING_PAUSED");
  }

  if (!lead.email) {
    reasons.push("MISSING_EMAIL");
    return { eligible: false, reasons };
  }

  const normalized = normalizeEmail(lead.email);

  if (!isValidEmailSyntax(normalized)) {
    reasons.push("INVALID_EMAIL_SYNTAX");
  }

  if (lead.isSuppressed) {
    reasons.push(`SUPPRESSED_${lead.suppressionReason || "UNKNOWN"}`);
  }

  const suppCheck = await isEmailSuppressed(normalized);
  if (suppCheck.suppressed) {
    reasons.push(`SUPPRESSED_${suppCheck.reason || "UNSUBSCRIBED"}`);
  }

  // Cooldown check (default 14 days)
  if (!options?.ignoreCooldown) {
    const now = new Date();
    if (lead.cooldownUntil && new Date(lead.cooldownUntil) > now) {
      reasons.push("COOLDOWN_ACTIVE");
    } else if (lead.lastEmailSentAt) {
      const cooldownMs = settings.cooldownDays * 24 * 60 * 60 * 1000;
      const lastSentTime = new Date(lead.lastEmailSentAt).getTime();
      if (now.getTime() - lastSentTime < cooldownMs) {
        reasons.push("COOLDOWN_ACTIVE");
      }
    }
  }

  // Duplicate / in-flight check for the same campaign or active processing
  if (lead._id) {
    const MessageModel = await getEmailMessageModel();
    if (options?.campaignId) {
      const existingInCampaign = await MessageModel.findOne({
        campaignId: options.campaignId as any,
        leadId: lead._id as any,
        status: { $in: ["QUEUED", "PROCESSING", "SENT"] },
      }).lean();
      if (existingInCampaign) {
        reasons.push("ALREADY_IN_CAMPAIGN");
      }
    }

    const inFlight = await MessageModel.findOne({
      leadId: lead._id as any,
      status: "PROCESSING",
    }).lean();
    if (inFlight) {
      reasons.push("ALREADY_PROCESSING");
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    metadata: {
      lastEmailSentAt: lead.lastEmailSentAt,
      cooldownUntil: lead.cooldownUntil,
      emailSentCount: lead.emailSentCount || 0,
      isSuppressed: lead.isSuppressed || false,
      suppressionReason: lead.suppressionReason,
    },
  };
}

export async function getNextEligibleLeads(limit: number = 10): Promise<ILead[]> {
  const settings = await getEmailSettings();
  if (settings.isMarketingPaused) return [];

  const LeadModel = await getLeadModel();
  const MessageModel = await getEmailMessageModel();
  const now = new Date();
  const cooldownThreshold = new Date(now.getTime() - settings.cooldownDays * 24 * 60 * 60 * 1000);

  // Active queue or processing leads should not be selected
  const activeJobs = await MessageModel.find({
    status: { $in: ["QUEUED", "PROCESSING"] },
  })
    .select("leadId")
    .lean();

  const excludedIds = activeJobs.map((j) => j.leadId).filter(Boolean);

  // High performance deterministic query across 100k+ records
  const query: Record<string, unknown> = {
    email: { $exists: true, $nin: [null, ""] },
    isSuppressed: { $ne: true },
    $and: [
      {
        $or: [
          { cooldownUntil: { $exists: false } },
          { cooldownUntil: null },
          { cooldownUntil: { $lte: now } },
        ],
      },
      {
        $or: [
          { lastEmailSentAt: { $exists: false } },
          { lastEmailSentAt: null },
          { lastEmailSentAt: { $lte: cooldownThreshold } },
        ],
      },
    ],
  };

  if (excludedIds.length > 0) {
    query._id = { $nin: excludedIds };
  }

  // Order: 1) Never sent first (0 count), 2) Lowest sent count, 3) Oldest last sent date, 4) Most recent lead
  const candidates = await LeadModel.find(query)
    .sort({ emailSentCount: 1, lastEmailSentAt: 1, createdAt: -1 })
    .limit(limit * 2)
    .lean();

  const eligible: ILead[] = [];
  for (const candidate of candidates) {
    if (eligible.length >= limit) break;
    const check = await checkLeadEligibility(candidate);
    if (check.eligible) {
      eligible.push(candidate as unknown as ILead);
    }
  }

  return eligible;
}

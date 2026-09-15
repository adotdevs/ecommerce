import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getLeadModel } from "@/models/Lead";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { getEmailAttemptModel } from "@/models/EmailAttempt";
import { getEmailCampaignModel } from "@/models/EmailCampaign";

export const GET = withAuth(async (request: NextRequest, ctx) => {
  try {
    const leadId = ctx.params?.id;
    if (!leadId) return apiError("Lead ID is required");

    const LeadModel = await getLeadModel();
    const MessageModel = await getEmailMessageModel();
    const AttemptModel = await getEmailAttemptModel();
    const CampaignModel = await getEmailCampaignModel();

    const lead = await LeadModel.findById(leadId).lean();
    if (!lead) {
      return apiError("Lead not found", 404);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));

    const [messages, total] = await Promise.all([
      MessageModel.find({ leadId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MessageModel.countDocuments({ leadId }),
    ]);

    const messageIds = messages.map((m) => m._id);
    const campaignIds = messages.map((m) => m.campaignId).filter(Boolean);

    const [attempts, campaigns] = await Promise.all([
      AttemptModel.find({ emailMessageId: { $in: messageIds as any } })
        .sort({ createdAt: -1 })
        .lean(),
      CampaignModel.find({ _id: { $in: campaignIds as any } })
        .select("_id name status")
        .lean(),
    ]);

    const campaignsById = new Map<string, string>();
    for (const c of campaigns) {
      campaignsById.set(String(c._id), c.name);
    }

    const attemptsByMessageId = new Map<string, typeof attempts>();
    for (const att of attempts) {
      const k = String(att.emailMessageId);
      const existing = attemptsByMessageId.get(k) || [];
      existing.push(att);
      attemptsByMessageId.set(k, existing);
    }

    const enrichedHistory = messages.map((msg) => ({
      ...msg,
      campaignName: msg.campaignId ? campaignsById.get(String(msg.campaignId)) : undefined,
      attempts: attemptsByMessageId.get(String(msg._id)) || [],
    }));

    return apiSuccess({
      lead,
      history: enrichedHistory,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to load lead email history", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

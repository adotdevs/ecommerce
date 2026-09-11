import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailCampaignModel } from "@/models/EmailCampaign";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { getEmailAttemptModel } from "@/models/EmailAttempt";

export const GET = withAuth(async (request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    if (!id) return apiError("Campaign ID is required");

    const CampaignModel = await getEmailCampaignModel();
    const MessageModel = await getEmailMessageModel();
    const AttemptModel = await getEmailAttemptModel();

    const campaign = await CampaignModel.findById(id).lean();
    if (!campaign) {
      return apiError("Campaign not found", 404);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status")?.trim();

    const query: Record<string, unknown> = { campaignId: id };
    if (status && status !== "ALL") {
      query.status = status;
    }

    const [messages, totalMessages] = await Promise.all([
      MessageModel.find(query)
        .sort({ queuedAt: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MessageModel.countDocuments(query),
    ]);

    const messageIds = messages.map((m) => m._id);
    const EventModel = await (await import("@/models/EmailEvent")).getEmailEventModel();

    const [attempts, clickEvents] = await Promise.all([
      AttemptModel.find({ emailMessageId: { $in: messageIds } })
        .sort({ createdAt: -1 })
        .lean(),
      EventModel.find({ campaignId: id, type: "CLICKED" })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    ]);

    // Aggregate link click breakdown
    const clicksByLinkType: Record<string, number> = {};
    const clicksByProduct: Record<string, number> = {};
    const clicksByUrl: Record<string, number> = {};

    for (const ev of clickEvents) {
      const meta = (ev.metadata || {}) as Record<string, string>;
      const lt = meta.linkType || "UNKNOWN";
      clicksByLinkType[lt] = (clicksByLinkType[lt] || 0) + 1;

      if (meta.productName) {
        clicksByProduct[meta.productName] = (clicksByProduct[meta.productName] || 0) + 1;
      }
      if (meta.targetUrl) {
        clicksByUrl[meta.targetUrl] = (clicksByUrl[meta.targetUrl] || 0) + 1;
      }
    }

    const attemptsByMessageId = new Map<string, typeof attempts[0]>();
    for (const att of attempts) {
      const k = String(att.emailMessageId);
      if (!attemptsByMessageId.has(k)) {
        attemptsByMessageId.set(k, att);
      }
    }

    const enrichedMessages = messages.map((m) => ({
      ...m,
      latestAttempt: attemptsByMessageId.get(String(m._id)) || null,
    }));

    return apiSuccess({
      campaign,
      messages: enrichedMessages,
      totalMessages,
      page,
      limit,
      pages: Math.ceil(totalMessages / limit) || 1,
      clickAnalytics: {
        totalClicks: clickEvents.length,
        byLinkType: clicksByLinkType,
        byProduct: Object.entries(clicksByProduct).map(([name, count]) => ({ name, count })),
        topLinks: Object.entries(clicksByUrl).map(([url, count]) => ({ url, count })),
      },
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to load campaign details", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

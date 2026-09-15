import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailCampaignModel } from "@/models/EmailCampaign";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { getEmailAttemptModel } from "@/models/EmailAttempt";
import { getEmailEventModel } from "@/models/EmailEvent";
import { getLeadModel } from "@/models/Lead";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";

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

    const enrichedMessages = messages.map((m) => {
      const att = attemptsByMessageId.get(String(m._id)) || null;
      const effectiveReason =
        m.failureReason ||
        att?.sanitizedError ||
        att?.providerResponse ||
        (m.status === "FAILED" ? "Delivery rejected by mail server" : undefined);

      return {
        ...m,
        latestAttempt: att,
        attemptsCount: m.totalAttempts ?? (att?.attemptNumber ?? 0),
        lastAttemptAt: m.lastAttemptAt || att?.finishedAt || att?.startedAt || undefined,
        lastErrorMessage: effectiveReason,
        lastSmtpCode: att?.smtpCode || undefined,
        failureCategory: m.failureCategory || att?.errorCategory || undefined,
        failureReason: effectiveReason,
      };
    });

    // Compute aggregated failure breakdown across the campaign
    const allFailedMessages = await MessageModel.find({
      campaignId: id,
      status: { $in: ["FAILED", "RETRYING"] },
    })
      .select("failureReason failureCategory recipientEmail")
      .lean();

    const reasonMap: Record<
      string,
      { reason: string; category: string; count: number; sampleRecipients: string[] }
    > = {};

    for (const fm of allFailedMessages) {
      const reasonKey = fm.failureReason || "Delivery rejected by mail server";
      const cat = fm.failureCategory || "UNKNOWN";
      if (!reasonMap[reasonKey]) {
        reasonMap[reasonKey] = {
          reason: reasonKey,
          category: cat,
          count: 0,
          sampleRecipients: [],
        };
      }
      reasonMap[reasonKey].count += 1;
      if (reasonMap[reasonKey].sampleRecipients.length < 3) {
        reasonMap[reasonKey].sampleRecipients.push(fm.recipientEmail);
      }
    }

    const failureSummary = Object.values(reasonMap).sort((a, b) => b.count - a.count);

    return apiSuccess({
      campaign,
      messages: enrichedMessages,
      totalMessages,
      page,
      limit,
      pages: Math.ceil(totalMessages / limit) || 1,
      failureSummary,
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

/**
 * DELETE /api/v1/admin/email/campaigns/[id]
 * Password-secured deletion of an email campaign and all its message queue records,
 * attempts, and events. Returns redoData so the client can immediately reload the campaign
 * into the Email Composer if desired.
 */
export const DELETE = withAuth(async (request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    if (!id) return apiError("Campaign ID is required");

    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (!password) {
      return apiError("Admin password is required to delete or clear a campaign", 400);
    }

    // Connect to core database to verify current admin's password
    await connectDB();
    const adminUser = await User.findById(ctx.user.id);
    if (!adminUser || !adminUser.passwordHash) {
      return apiError("Admin authentication session invalid. Please log in again.", 401);
    }

    const isMatch = await verifyPassword(password, adminUser.passwordHash);
    if (!isMatch) {
      return apiError("Incorrect admin password. Deletion denied.", 403);
    }

    const CampaignModel = await getEmailCampaignModel();
    const MessageModel = await getEmailMessageModel();
    const AttemptModel = await getEmailAttemptModel();
    const EventModel = await getEmailEventModel();
    const LeadModel = await getLeadModel();

    const campaign = await CampaignModel.findById(id).lean();
    if (!campaign) {
      return apiError("Campaign not found", 404);
    }

    // Extract leads and campaign draft data for redo
    const messages = await MessageModel.find({ campaignId: id }).select("leadId recipientEmail recipientName").lean();
    const leadIds = Array.from(new Set(messages.map((m) => String(m.leadId)).filter(Boolean)));

    const leads = leadIds.length > 0
      ? await LeadModel.find({ _id: { $in: leadIds } }).select("_id email firstName lastName country phone").lean()
      : [];

    const redoData = {
      campaignName: campaign.name,
      subject: campaign.subject,
      previewText: campaign.previewText || "",
      headline: campaign.headline || (campaign as any).headlineSnapshot || "",
      body: campaign.body || "",
      productId: campaign.productId || undefined,
      productName: campaign.productSnapshot?.name || (campaign as any).productName || undefined,
      productPrice: campaign.productSnapshot?.price || (campaign as any).productPrice || undefined,
      emailDocumentSnapshot: campaign.emailDocument || (campaign as any).emailDocumentSnapshot || undefined,
      leads: leads.map((l) => ({
        _id: String(l._id),
        email: l.email,
        firstName: l.firstName,
        lastName: l.lastName,
        country: l.country,
        phone: l.phone,
      })),
    };

    // Cascade delete: messages, attempts, and campaign record
    await Promise.all([
      MessageModel.deleteMany({ campaignId: id }),
      AttemptModel.deleteMany({ campaignId: id }),
      EventModel.deleteMany({ campaignId: id }),
      CampaignModel.findByIdAndDelete(id),
    ]);

    // Record audit event
    await EventModel.create({
      type: "DELETED",
      actor: ctx.user.email,
      campaignId: id,
      metadata: {
        campaignName: campaign.name,
        totalRecipients: (campaign as any).totalRecipients || campaign.audienceCount || campaign.eligibleCount || 0,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
      },
    });

    return apiSuccess({
      deleted: true,
      campaignId: id,
      campaignName: campaign.name,
      redoData,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to delete campaign", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

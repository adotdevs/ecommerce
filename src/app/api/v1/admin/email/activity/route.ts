import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { getEmailCampaignModel } from "@/models/EmailCampaign";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status")?.trim();
    const q = searchParams.get("q")?.trim();
    const campaignId = searchParams.get("campaignId")?.trim();
    const format = searchParams.get("format")?.trim();

    const MessageModel = await getEmailMessageModel();
    const CampaignModel = await getEmailCampaignModel();

    const query: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      query.status = status;
    }
    if (campaignId) {
      query.campaignId = campaignId;
    }
    if (q) {
      query.$or = [
        { recipientEmail: { $regex: q, $options: "i" } },
        { recipientName: { $regex: q, $options: "i" } },
        { subjectSnapshot: { $regex: q, $options: "i" } },
      ];
    }

    if (format === "csv") {
      const allRows = await MessageModel.find(query)
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

      const csvHeader = "ID,Recipient,Status,Subject,SentAt,Attempts,FailureReason,Created\n";
      const csvRows = allRows.map((r) => {
        const cleanSubject = `"${(r.subjectSnapshot || "").replace(/"/g, '""')}"`;
        const cleanErr = `"${(r.failureReason || "").replace(/"/g, '""')}"`;
        return `${r._id},${r.recipientEmail},${r.status},${cleanSubject},${r.sentAt || ""},${r.totalAttempts || 0},${cleanErr},${r.createdAt}`;
      }).join("\n");

      return new Response(csvHeader + csvRows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="email-activity-${Date.now()}.csv"`,
        },
      });
    }

    const [items, total] = await Promise.all([
      MessageModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MessageModel.countDocuments(query),
    ]);

    const campaignIds = Array.from(new Set(items.map((i) => String(i.campaignId)).filter(Boolean)));
    const campaigns = await CampaignModel.find({ _id: { $in: campaignIds } })
      .select("_id name")
      .lean();

    const campaignMap = new Map<string, string>();
    for (const c of campaigns) {
      campaignMap.set(String(c._id), c.name);
    }

    const enriched = items.map((msg) => ({
      ...msg,
      campaignName: msg.campaignId ? campaignMap.get(String(msg.campaignId)) : undefined,
    }));

    return apiSuccess({
      items: enriched,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to load activity log", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

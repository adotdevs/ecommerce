import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailCampaignModel } from "@/models/EmailCampaign";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { processEmailMessage } from "@/lib/email/queue";
import { getEmailSettings } from "@/lib/email/settings";

export const POST = withAuth(async (request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    if (!id) return apiError("Campaign ID is required");

    const settings = await getEmailSettings();
    if (settings.isMarketingPaused) {
      return apiError("Marketing emails are currently paused via the emergency kill switch.", 403);
    }

    const CampaignModel = await getEmailCampaignModel();
    const MessageModel = await getEmailMessageModel();

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return apiError("Campaign not found", 404);
    }

    if (campaign.status === "CANCELLED") {
      return apiError("Cannot process a cancelled campaign.");
    }

    // Find up to 10 queued or retrying messages for this campaign
    const pendingMessages = await MessageModel.find({
      campaignId: id,
      status: { $in: ["QUEUED", "RETRYING"] },
    })
      .limit(10)
      .lean();

    if (pendingMessages.length === 0) {
      // Check if campaign is finished
      const remaining = await MessageModel.countDocuments({
        campaignId: id,
        status: { $in: ["QUEUED", "PROCESSING", "RETRYING"] },
      });

      if (remaining === 0) {
        const finalStatus = campaign.failedCount > 0 ? (campaign.sentCount > 0 ? "PARTIALLY_FAILED" : "FAILED") : "COMPLETED";
        await CampaignModel.updateOne(
          { _id: id },
          { $set: { status: finalStatus, completedAt: new Date() } }
        );
      }

      return apiSuccess({
        processed: 0,
        message: "No pending messages ready for processing in this campaign.",
      });
    }

    await CampaignModel.updateOne(
      { _id: id },
      { $set: { status: "PROCESSING", startedAt: campaign.startedAt || new Date() } }
    );

    const results = [];
    for (const msg of pendingMessages) {
      // Atomically claim the message
      const claimed = await MessageModel.findOneAndUpdate(
        { _id: msg._id, status: { $in: ["QUEUED", "RETRYING"] } },
        {
          $set: {
            status: "PROCESSING",
            processingStartedAt: new Date(),
          },
          $inc: { totalAttempts: 1 },
        },
        { new: true }
      );

      if (claimed) {
        const res = await processEmailMessage(claimed);
        results.push(res);
      }
    }

    // Check if campaign is now complete
    const remainingCount = await MessageModel.countDocuments({
      campaignId: id,
      status: { $in: ["QUEUED", "PROCESSING", "RETRYING"] },
    });

    if (remainingCount === 0) {
      const updatedCampaign = await CampaignModel.findById(id).lean();
      const finalStatus =
        (updatedCampaign?.failedCount || 0) > 0
          ? (updatedCampaign?.sentCount || 0) > 0
            ? "PARTIALLY_FAILED"
            : "FAILED"
          : "COMPLETED";

      await CampaignModel.updateOne(
        { _id: id },
        { $set: { status: finalStatus, completedAt: new Date() } }
      );
    }

    return apiSuccess({
      processed: results.length,
      results,
      remainingCount,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to process campaign", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

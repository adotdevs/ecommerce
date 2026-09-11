import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailCampaignModel } from "@/models/EmailCampaign";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { getEmailEventModel } from "@/models/EmailEvent";

export const POST = withAuth(async (request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    if (!id) return apiError("Campaign ID is required");

    const CampaignModel = await getEmailCampaignModel();
    const MessageModel = await getEmailMessageModel();
    const EventModel = await getEmailEventModel();

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return apiError("Campaign not found", 404);
    }

    if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
      return apiError(`Campaign is already ${campaign.status.toLowerCase()}.`);
    }

    // Cancel all remaining messages that are QUEUED, RETRYING, or SCHEDULED
    const cancelRes = await MessageModel.updateMany(
      {
        campaignId: id as any,
        status: { $in: ["QUEUED", "RETRYING"] as any },
      },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      }
    );

    const cancelledCount = cancelRes.modifiedCount || 0;

    await CampaignModel.updateOne(
      { _id: id },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
        $inc: { cancelledCount },
      }
    );

    await EventModel.create({
      campaignId: id,
      type: "CANCELLED",
      actor: ctx.user.email,
      metadata: { cancelledCount },
    });

    return apiSuccess({
      message: `Campaign cancelled. ${cancelledCount} remaining message(s) cancelled.`,
      cancelledCount,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to cancel campaign", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

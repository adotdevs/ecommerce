import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailCampaignModel } from "@/models/EmailCampaign";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { getEmailEventModel } from "@/models/EmailEvent";
import { processPendingQueue } from "@/lib/email/queue";

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

    // Reset failed messages whose error was not permanent suppression
    const retryRes = await MessageModel.updateMany(
      {
        campaignId: id,
        status: "FAILED",
        failureCategory: { $nin: ["MAILBOX_NOT_FOUND", "RECIPIENT_REJECTED", "SUPPRESSED", "INVALID_RECIPIENT"] },
      },
      {
        $set: {
          status: "QUEUED",
          queuedAt: new Date(),
          failedAt: null,
          failureReason: null,
        },
      }
    );

    const queuedForRetry = retryRes.modifiedCount || 0;

    if (queuedForRetry > 0) {
      await CampaignModel.updateOne(
        { _id: id },
        {
          $set: { status: "PROCESSING" },
          $inc: { failedCount: -queuedForRetry, queuedCount: queuedForRetry },
        }
      );

      await EventModel.create({
        campaignId: id,
        type: "RETRIED",
        actor: ctx.user.email,
        metadata: { queuedForRetry },
      });

      // Trigger queue processing
      processPendingQueue(queuedForRetry).catch((err) => {
        console.error("Async retry error:", err);
      });
    }

    return apiSuccess({
      message: `${queuedForRetry} failed message(s) queued for retry.`,
      queuedForRetry,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to retry campaign", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailCampaignModel } from "@/models/EmailCampaign";

/**
 * GET — Load campaign email document draft
 * PUT — Save/autosave email document draft
 */

export const GET = withAuth(async (request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    const CampaignModel = await getEmailCampaignModel();
    const campaign = await CampaignModel.findById(id)
      .select("name subject emailDocument emailDocumentVersion status productSnapshot")
      .lean();

    if (!campaign) {
      return apiError("Campaign not found", 404);
    }

    return apiSuccess({
      campaignId: id,
      name: campaign.name,
      subject: campaign.subject,
      emailDocument: campaign.emailDocument || null,
      emailDocumentVersion: campaign.emailDocumentVersion || 0,
      status: campaign.status,
      productSnapshot: campaign.productSnapshot,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to load document", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const PUT = withAuth(async (request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    const body = await request.json().catch(() => ({}));
    const { emailDocument, subject, previewText } = body;

    if (!emailDocument) {
      return apiError("Email document is required.");
    }

    const CampaignModel = await getEmailCampaignModel();
    const campaign = await CampaignModel.findById(id);

    if (!campaign) {
      return apiError("Campaign not found", 404);
    }

    // Only allow saving drafts — not completed/cancelled campaigns
    if (["COMPLETED", "CANCELLED", "FAILED"].includes(campaign.status)) {
      return apiError("Cannot modify a completed or cancelled campaign.", 400);
    }

    const updates: Record<string, unknown> = {
      emailDocument,
      emailDocumentVersion: (campaign.emailDocumentVersion || 0) + 1,
      updatedBy: ctx.user.email,
    };

    if (subject !== undefined) updates.subject = subject;
    if (previewText !== undefined) updates.previewText = previewText;

    await CampaignModel.updateOne({ _id: id }, { $set: updates });

    return apiSuccess({
      saved: true,
      version: updates.emailDocumentVersion,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to save document", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getLeadModel } from "@/models/Lead";
import { suppressEmail, unsuppressEmail } from "@/lib/email/suppression";

const bodySchema = z.object({
  blocked: z.boolean(),
  notes: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, ctx) => {
  try {
    const leadId = ctx.params?.id;
    if (!leadId) return apiError("Lead ID is required");

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const LeadModel = await getLeadModel();
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      return apiError("Lead not found", 404);
    }

    if (!lead.email) {
      return apiError("Lead has no email address to block.");
    }

    if (parsed.data.blocked) {
      await suppressEmail({
        email: lead.email,
        reason: "MANUAL_BLOCK",
        source: "admin_manual_block",
        actor: ctx.user.email,
        notes: parsed.data.notes || "Blocked by admin",
        leadId: String(lead._id),
      });
    } else {
      await unsuppressEmail(lead.email, ctx.user.email);
    }

    return apiSuccess({
      leadId: String(lead._id),
      email: lead.email,
      blocked: parsed.data.blocked,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to update lead block status", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

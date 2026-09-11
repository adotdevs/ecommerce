import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getLeadModel } from "@/models/Lead";
import { checkLeadEligibility } from "@/lib/email/eligibility";

const querySchema = z.object({
  leadId: z.string().optional(),
  email: z.string().optional(),
  ignoreCooldown: z.enum(["true", "false"]).optional(),
});

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const { leadId, email, ignoreCooldown } = parsed.data;
    const LeadModel = await getLeadModel();

    let leadData: any = null;
    if (leadId) {
      leadData = await LeadModel.findById(leadId).lean();
    } else if (email) {
      leadData = await LeadModel.findOne({ email: email.toLowerCase().trim() }).lean();
      if (!leadData) {
        leadData = { email: email.toLowerCase().trim() };
      }
    }

    if (!leadData) {
      return apiError("Lead not found", 404);
    }

    const result = await checkLeadEligibility(leadData, {
      ignoreCooldown: ignoreCooldown === "true",
    });

    return apiSuccess({
      lead: leadData,
      eligibility: result,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to evaluate eligibility", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

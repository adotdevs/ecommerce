import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getNextEligibleLeads } from "@/lib/email/eligibility";
import { getDailyQuotaStatus } from "@/lib/email/quota";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const quota = await getDailyQuotaStatus();
    if (quota.isPaused) {
      return apiError("Marketing emails are currently paused via the emergency kill switch.", 403);
    }

    // Limit to remaining daily quota or requested limit, whichever is lower
    const targetCount = Math.min(parsed.data.limit, quota.remaining > 0 ? quota.remaining : 10);
    const leads = await getNextEligibleLeads(targetCount);

    return apiSuccess({
      leads,
      count: leads.length,
      quota,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to fetch eligible leads", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

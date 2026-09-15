import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailSettings, updateEmailSettings } from "@/lib/email/settings";
import { getDailyQuotaStatus } from "@/lib/email/quota";

const updateSettingsSchema = z.object({
  dailyLimit: z.number().int().min(1).max(1000).optional(),
  hourlyLimit: z.number().int().min(0).max(500).optional(),
  cooldownDays: z.number().int().min(0).max(365).optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
  retryDelayMinutes: z.number().int().min(1).max(1440).optional(),
  defaultSenderName: z.string().trim().min(1).optional(),
  defaultSenderEmail: z.string().email().optional(),
  defaultReplyTo: z.string().email().optional(),
  defaultFooterCopy: z.string().optional(),
  companyAddress: z.string().optional(),
  defaultTestRecipient: z.string().email().optional().or(z.literal("")),
  defaultUtmSource: z.string().trim().min(1).optional(),
  defaultUtmMedium: z.string().trim().min(1).optional(),
  isAiAssistanceEnabled: z.boolean().optional(),
  isMarketingPaused: z.boolean().optional(),
});

export const GET = withAuth(async () => {
  try {
    const [settings, quota] = await Promise.all([
      getEmailSettings(),
      getDailyQuotaStatus(),
    ]);

    return apiSuccess({
      settings,
      quota,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to load settings", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const PUT = withAuth(async (request: NextRequest, ctx) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const updated = await updateEmailSettings(parsed.data, ctx.user.email);
    const quota = await getDailyQuotaStatus();

    return apiSuccess({ settings: updated, quota });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to update settings", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

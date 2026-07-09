import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { runFullSiteTranslation } from "@/lib/i18n/site-translate";
import { isAutoTranslationAvailable } from "@/lib/i18n/translate";
import { z } from "zod";

export const maxDuration = 300;

const bodySchema = z.object({
  targetLocale: z.string().min(2),
});

export const POST = withAuth(async (request: NextRequest) => {
  if (!isAutoTranslationAvailable()) {
    return apiError(
      "Auto-translate is disabled. Set TRANSLATION_PROVIDER=mymemory in .env.local",
      400
    );
  }

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { targetLocale } = parsed.data;
    if (targetLocale === "en") {
      return apiError("English is the source language — pick another locale.", 400);
    }

    const result = await runFullSiteTranslation(targetLocale);
    return apiSuccess(result);
  } catch (err) {
    console.error(err);
    return apiError(
      err instanceof Error ? err.message : "Translation failed",
      500
    );
  }
}, PERMISSIONS.CMS_WRITE);

import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { improveEmailDraft } from "@/lib/email/ai";
import { isOpenAiConfigured } from "@/lib/ai/openai-client";

const improveSchema = z.object({
  currentDraft: z.object({
    subject: z.string(),
    previewText: z.string().optional(),
    headline: z.string().optional(),
    body: z.string(),
    ctaText: z.string().optional(),
  }),
  action: z.enum([
    "shorter",
    "more_premium",
    "more_friendly",
    "more_persuasive",
    "less_salesy",
    "improve_cta",
    "fix_grammar",
  ]),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!isOpenAiConfigured()) {
      return apiError("OpenAI API key is not configured.", 503);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = improveSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const draft = await improveEmailDraft(parsed.data);
    if (!draft) {
      return apiError("AI improvement failed. Current draft preserved.", 502);
    }

    return apiSuccess({ draft });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "AI improvement error", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

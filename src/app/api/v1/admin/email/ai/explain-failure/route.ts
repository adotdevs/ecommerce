import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { explainSmtpFailure } from "@/lib/email/ai";
import { isOpenAiConfigured } from "@/lib/ai/openai-client";

const explainSchema = z.object({
  smtpCode: z.number().optional(),
  category: z.string().optional(),
  rawError: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!isOpenAiConfigured()) {
      return apiError("OpenAI API key is not configured.", 503);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = explainSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const explanation = await explainSmtpFailure(parsed.data);
    return apiSuccess({ explanation });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "AI explanation error", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

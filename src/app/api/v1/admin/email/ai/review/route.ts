import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { aiPreSendReview } from "@/lib/email/ai";
import { isOpenAiConfigured } from "@/lib/ai/openai-client";

const reviewSchema = z.object({
  subject: z.string().min(1),
  previewText: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().min(1),
  ctaText: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!isOpenAiConfigured()) {
      return apiError("OpenAI API key is not configured.", 503);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = reviewSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const review = await aiPreSendReview(parsed.data);
    if (!review) {
      return apiError("AI review failed. You can still proceed manually.", 502);
    }

    return apiSuccess({ review });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "AI review error", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

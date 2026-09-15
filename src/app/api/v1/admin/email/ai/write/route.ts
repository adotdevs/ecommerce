import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { generateAiDraft } from "@/lib/email/ai";
import { isOpenAiConfigured } from "@/lib/ai/openai-client";

const writeSchema = z.object({
  product: z
    .object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number().optional(),
      salePrice: z.number().optional(),
      category: z.string().optional(),
    })
    .optional(),
  goal: z.string().optional(),
  tone: z.string().optional(),
  couponCode: z.string().optional(),
  leadContext: z
    .object({
      firstName: z.string().optional(),
      previousEmailsCount: z.number().optional(),
      lastEmailedDaysAgo: z.number().optional(),
      previousSubjects: z.array(z.string()).optional(),
    })
    .optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!isOpenAiConfigured()) {
      return apiError("OpenAI API key is not configured.", 503);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = writeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const draft = await generateAiDraft(parsed.data);
    if (!draft) {
      return apiError("AI generation failed. Please try again or write manually.", 502);
    }

    return apiSuccess({ draft });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "AI generation error", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

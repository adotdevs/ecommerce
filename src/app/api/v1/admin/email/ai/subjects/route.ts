import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { generateSubjectLineOptions } from "@/lib/email/ai";
import { isOpenAiConfigured } from "@/lib/ai/openai-client";

const subjectSchema = z.object({
  productName: z.string().optional(),
  headline: z.string().optional(),
  bodySnippet: z.string().optional(),
  discount: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!isOpenAiConfigured()) {
      return apiError("OpenAI API key is not configured.", 503);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = subjectSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const options = await generateSubjectLineOptions(parsed.data);
    return apiSuccess({ options });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "AI subject generation error", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

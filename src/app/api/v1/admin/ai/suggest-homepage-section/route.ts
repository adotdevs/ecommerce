import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { suggestHomepageSection } from "@/lib/admin/cms-ai-suggest";
import { z } from "zod";

const schema = z.object({
  sectionType: z.string().min(1),
  prompt: z.string().min(1),
  currentConfig: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);
    const config = await suggestHomepageSection(
      parsed.data.sectionType,
      parsed.data.prompt,
      parsed.data.currentConfig
    );
    return apiSuccess({ config });
  } catch (err) {
    console.error(err);
    return apiError("AI suggestion failed", 500);
  }
}, PERMISSIONS.CMS_READ);

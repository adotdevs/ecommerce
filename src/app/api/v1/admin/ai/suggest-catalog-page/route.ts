import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { suggestCatalogPageContent } from "@/lib/admin/cms-ai-suggest";
import type { CatalogPageSlug } from "@/models/CatalogPage";
import { z } from "zod";

const schema = z.object({
  slug: z.string().min(1),
  hint: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);
    const suggestion = await suggestCatalogPageContent(
      parsed.data.slug as CatalogPageSlug,
      parsed.data.hint
    );
    return apiSuccess(suggestion);
  } catch (err) {
    console.error(err);
    return apiError("AI suggestion failed", 500);
  }
}, PERMISSIONS.CMS_READ);

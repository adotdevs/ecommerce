import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { suggestBrandContent } from "@/lib/admin/cms-ai-suggest";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  categories: z.array(z.string()).optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);
    const suggestion = await suggestBrandContent(
      parsed.data.name,
      parsed.data.categories
    );
    return apiSuccess(suggestion);
  } catch (err) {
    console.error(err);
    return apiError("AI suggestion failed", 500);
  }
}, PERMISSIONS.PRODUCTS_READ);

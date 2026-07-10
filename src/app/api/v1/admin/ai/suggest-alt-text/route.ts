import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { suggestImageAltText } from "@/lib/admin/cms-ai-suggest";
import { z } from "zod";

const schema = z.object({
  productName: z.string().min(1),
  imageIndex: z.number().optional(),
  context: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);
    const alt = await suggestImageAltText(
      parsed.data.productName,
      parsed.data.imageIndex,
      parsed.data.context
    );
    return apiSuccess({ alt });
  } catch (err) {
    console.error(err);
    return apiError("Alt text generation failed", 500);
  }
}, PERMISSIONS.PRODUCTS_READ);

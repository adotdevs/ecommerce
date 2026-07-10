import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { suggestProductCopy } from "@/lib/admin/product-copy-suggest";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  categories: z.array(z.string()).optional(),
  brand: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return apiError(
        issue.path.length
          ? `${issue.path.join(".")}: ${issue.message}`
          : issue.message
      );
    }

    const suggestion = await suggestProductCopy(parsed.data);
    return apiSuccess(suggestion);
  } catch (err) {
    console.error(err);
    return apiError("Failed to generate suggestions", 500);
  }
}, PERMISSIONS.PRODUCTS_READ);

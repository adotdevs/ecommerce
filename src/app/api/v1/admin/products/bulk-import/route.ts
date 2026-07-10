import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  bulkImportProducts,
  parseProductNameList,
} from "@/lib/admin/bulk-product-import";
import { z } from "zod";

export const maxDuration = 300;

const schema = z.object({
  input: z.string().min(1),
  publish: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  brandId: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const names = parseProductNameList(parsed.data.input);
    if (!names.length) {
      return apiError("No product names found. Enter one per line or comma-separated.");
    }
    if (names.length > 30) {
      return apiError("Maximum 30 products per bulk import.");
    }

    const result = await bulkImportProducts(names, {
      publish: parsed.data.publish ?? false,
      categoryIds: parsed.data.categoryIds,
      brandId: parsed.data.brandId,
    });

    return apiSuccess(result);
  } catch (err) {
    console.error(err);
    return apiError(
      err instanceof Error ? err.message : "Bulk import failed",
      500
    );
  }
}, PERMISSIONS.PRODUCTS_WRITE);

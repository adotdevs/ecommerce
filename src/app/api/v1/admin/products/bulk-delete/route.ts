import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { deleteProductsByIds } from "@/lib/admin/delete-products";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return apiError(issue.message);
    }

    const uniqueIds = [...new Set(parsed.data.ids)];
    const result = await deleteProductsByIds(uniqueIds);

    return apiSuccess({
      deleted: result.deleted,
      notFound: result.notFound,
      requested: uniqueIds.length,
    });
  } catch (err) {
    console.error("Bulk delete products error:", err);
    return apiError("Failed to delete products", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

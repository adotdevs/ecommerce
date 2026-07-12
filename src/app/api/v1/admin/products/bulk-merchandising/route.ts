import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";

const bulkMerchandisingSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  featured: z.boolean().optional(),
  flashSale: z.boolean().optional(),
  onSale: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = bulkMerchandisingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { ids, featured, flashSale, onSale, isNewArrival } = parsed.data;
    const update: Record<string, boolean> = {};

    if (featured !== undefined) update.featured = featured;
    if (flashSale !== undefined) update.flashSale = flashSale;
    if (onSale !== undefined) update.onSale = onSale;
    if (isNewArrival !== undefined) update.isNewArrival = isNewArrival;

    if (Object.keys(update).length === 0) {
      return apiError("No merchandising fields to update");
    }

    const uniqueIds = [...new Set(ids)];
    const result = await Product.updateMany(
      { _id: { $in: uniqueIds } },
      { $set: update }
    );

    return apiSuccess({
      matched: result.matchedCount,
      modified: result.modifiedCount,
      requested: uniqueIds.length,
    });
  } catch (err) {
    console.error("Bulk merchandising error:", err);
    return apiError("Failed to update products", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

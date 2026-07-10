import { connectDB } from "@/lib/db/mongoose";
import { Product, ProductReview } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { syncProductRating } from "@/lib/reviews/sync-rating";

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();

  const product = await Product.findById(params?.id).select("_id").lean();
  if (!product) return apiNotFound();

  const deleted = await ProductReview.findOneAndDelete({
    _id: params?.reviewId,
    productId: product._id,
  });

  if (!deleted) return apiNotFound("Review not found");

  const summary = await syncProductRating(product._id);
  return apiSuccess({ deleted: true, summary });
}, PERMISSIONS.PRODUCTS_WRITE);

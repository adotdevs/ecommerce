import mongoose from "mongoose";
import { Product, ProductReview } from "@/models";

export async function deleteProductsByIds(ids: string[]) {
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) {
    return { deleted: 0, notFound: ids.length };
  }

  const [deleteResult] = await Promise.all([
    Product.deleteMany({ _id: { $in: objectIds } }),
    ProductReview.deleteMany({ productId: { $in: objectIds } }),
  ]);

  const deleted = deleteResult.deletedCount ?? 0;
  return {
    deleted,
    notFound: Math.max(0, ids.length - deleted),
  };
}

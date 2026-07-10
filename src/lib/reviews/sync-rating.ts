import mongoose from "mongoose";
import { Product } from "@/models/Product";
import { ProductReview } from "@/models/ProductReview";

export interface ReviewSummaryData {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

function toProductObjectId(productId: string | mongoose.Types.ObjectId) {
  return typeof productId === "string"
    ? new mongoose.Types.ObjectId(productId)
    : productId;
}

export async function computeReviewSummary(
  productId: string | mongoose.Types.ObjectId
): Promise<ReviewSummaryData> {
  const id = toProductObjectId(productId);

  const [stats, distribution] = await Promise.all([
    ProductReview.aggregate([
      {
        $match: {
          productId: id,
          status: "published",
          rating: { $gte: 1, $lte: 5 },
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]),
    ProductReview.aggregate([
      {
        $match: {
          productId: id,
          status: "published",
          rating: { $gte: 1, $lte: 5 },
        },
      },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]),
  ]);

  const average =
    stats[0]?.average != null ? Math.round(stats[0].average * 10) / 10 : 0;
  const count = stats[0]?.count ?? 0;

  const ratingDistribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const row of distribution) {
    const star = Number(row._id);
    if (star >= 1 && star <= 5) {
      ratingDistribution[star] = row.count;
    }
  }

  return { average, count, distribution: ratingDistribution };
}

export async function syncProductRating(
  productId: string | mongoose.Types.ObjectId
): Promise<ReviewSummaryData> {
  const summary = await computeReviewSummary(productId);

  await Product.findByIdAndUpdate(toProductObjectId(productId), {
    $set: {
      "rating.average": summary.average,
      "rating.count": summary.count,
    },
  });

  return summary;
}

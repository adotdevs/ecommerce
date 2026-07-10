import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Product, ProductReview } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import {
  adminGenerateReviewsSchema,
  adminManualReviewSchema,
} from "@/lib/validators";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { generateProductReviews } from "@/lib/admin/product-reviews-generate";
import { syncProductRating, computeReviewSummary } from "@/lib/reviews/sync-rating";

function formatAdminReview(review: {
  _id: { toString(): string };
  userName: string;
  rating: number;
  title: string;
  body: string;
  source?: string;
  createdAt?: Date;
}) {
  return {
    _id: review._id.toString(),
    userName: review.userName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    source: review.source ?? "admin",
    createdAt: review.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export const GET = withAuth(async (_request, { params }) => {
  await connectDB();
  const product = await Product.findById(params?.id).select("name rating").lean();
  if (!product) return apiNotFound();

  const [reviews, summary] = await Promise.all([
    ProductReview.find({ productId: product._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    computeReviewSummary(product._id),
  ]);

  return apiSuccess({
    productName: product.name,
    summary,
    reviews: reviews.map(formatAdminReview),
  });
}, PERMISSIONS.PRODUCTS_READ);

export const POST = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const product = await Product.findById(params?.id).lean();
    if (!product) return apiNotFound();

    const body = await request.json();
    const mode = body.mode === "manual" ? "manual" : "generate";

    if (mode === "manual") {
      const parsed = adminManualReviewSchema.safeParse(body);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? "Invalid review");
      }

      const createdAt = parsed.data.createdAt
        ? new Date(parsed.data.createdAt)
        : new Date();

      const review = new ProductReview({
        productId: product._id,
        userId: new mongoose.Types.ObjectId(),
        userName: parsed.data.userName.trim(),
        rating: parsed.data.rating,
        title: parsed.data.title.trim(),
        body: parsed.data.body.trim(),
        images: [],
        status: "published",
        source: "admin",
      });
      review.createdAt = createdAt;
      review.updatedAt = createdAt;
      await review.save();

      const summary = await syncProductRating(product._id);
      return apiSuccess({ review: formatAdminReview(review), summary }, 201);
    }

    const parsed = adminGenerateReviewsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid options");
    }

    const drafts = await generateProductReviews({
      productName: product.name,
      productDescription:
        product.shortDescription ?? product.description ?? undefined,
      count: parsed.data.count,
      targetAverage: parsed.data.targetAverage,
      dateRangeDays: parsed.data.dateRangeDays,
      notes: parsed.data.notes,
    });

    const docs = drafts.map((d) => ({
      productId: product._id,
      userId: new mongoose.Types.ObjectId(),
      userName: d.userName,
      rating: d.rating,
      title: d.title,
      body: d.body,
      images: [],
      status: "published" as const,
      source: "admin" as const,
      createdAt: d.createdAt,
      updatedAt: d.createdAt,
    }));

    const inserted = await ProductReview.insertMany(docs);
    const summary = await syncProductRating(product._id);

    return apiSuccess(
      {
        created: inserted.length,
        summary,
        reviews: inserted.map(formatAdminReview),
      },
      201
    );
  } catch (err) {
    console.error(err);
    return apiError("Failed to add reviews", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Product, ProductReview } from "@/models";
import { getAuthUser } from "@/lib/auth/session";
import { syncProductRating, computeReviewSummary } from "@/lib/reviews/sync-rating";
import { maskReviewerName } from "@/lib/reviews/mask-reviewer";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

function formatReview(review: {
  _id: { toString(): string };
  userId: { toString(): string };
  userName: string;
  rating: number;
  title: string;
  body: string;
  images?: { url: string; alt?: string }[];
  createdAt?: Date;
}) {
  return {
    _id: review._id.toString(),
    userId: review.userId.toString(),
    userName: maskReviewerName(review.userName),
    rating: review.rating,
    title: review.title,
    body: review.body,
    images: (review.images ?? []).map((img) => ({
      url: String(img.url),
      alt: img.alt ? String(img.alt) : undefined,
    })),
    createdAt: review.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  await connectDB();
  const { slug } = await params;
  const product = await Product.findOne({ slug, status: "published" })
    .select("_id rating")
    .lean();
  if (!product) return apiError("Product not found", 404);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? 10)));
  const skip = (page - 1) * limit;

  const [reviews, total, summary] = await Promise.all([
    ProductReview.find({ productId: product._id, status: "published" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductReview.countDocuments({ productId: product._id, status: "published" }),
    computeReviewSummary(product._id),
  ]);

  // Keep denormalized product rating in sync
  if (
    summary.count !== (product.rating?.count ?? 0) ||
    summary.average !== (product.rating?.average ?? 0)
  ) {
    await syncProductRating(product._id);
  }

  const authUser = getAuthUser(request);
  let userReview = null;
  if (authUser) {
    const existing = await ProductReview.findOne({
      productId: product._id,
      userId: authUser.id,
    }).lean();
    if (existing) userReview = formatReview(existing);
  }

  return apiSuccess({
    summary,
    reviews: reviews.map(formatReview),
    userReview,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = getAuthUser(request);
  if (!user) return apiUnauthorized("Sign in to leave a review");

  await connectDB();
  const { slug } = await params;
  const product = await Product.findOne({ slug, status: "published" }).lean();
  if (!product) return apiError("Product not found", 404);

  const body = await request.json();
  const rating = Number(body.rating);
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const images = Array.isArray(body.images) ? body.images : [];

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return apiError("Rating must be between 1 and 5");
  }
  if (title.length < 3) return apiError("Title must be at least 3 characters");
  if (text.length < 10) return apiError("Review must be at least 10 characters");
  if (images.length > 5) return apiError("Maximum 5 images per review");

  const sanitizedImages = images
    .slice(0, 5)
    .filter((img: unknown) => img && typeof img === "object" && "url" in img)
    .map((img: { url: string; alt?: string }) => ({
      url: String(img.url),
      alt: img.alt ? String(img.alt).slice(0, 120) : undefined,
    }));

  const userName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email.split("@")[0];

  const userOid = new mongoose.Types.ObjectId(user.id);

  const existing = await ProductReview.findOne({
    productId: product._id,
    userId: userOid,
  });

  let review;
  if (existing) {
    existing.rating = rating;
    existing.title = title;
    existing.body = text;
    existing.images = sanitizedImages;
    existing.userName = userName;
    existing.status = "published";
    await existing.save();
    review = existing;
  } else {
    review = await ProductReview.create({
      productId: product._id,
      userId: userOid,
      userName,
      rating,
      title,
      body: text,
      images: sanitizedImages,
      status: "published",
    });
  }

  const summary = await syncProductRating(product._id.toString());

  return apiSuccess({
    review: formatReview(review),
    summary,
  });
}

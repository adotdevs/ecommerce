import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "12");
  const sort = searchParams.get("sort");
  const category = searchParams.get("category");
  const brand = searchParams.get("brand");
  const featured = searchParams.get("featured");
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { status: "published" };
  if (category) filter.categoryNames = category;
  if (brand) filter.brandName = brand;
  if (featured === "true") filter.featured = true;

  let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
  if (sort === "bestsellers") sortQuery = { "inventory.stock": -1 };
  if (sort === "price-asc") sortQuery = { "pricing.price": 1 };
  if (sort === "price-desc") sortQuery = { "pricing.price": -1 };
  if (sort === "deals") {
    filter["pricing.compareAtPrice"] = { $exists: true, $gt: 0 };
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortQuery).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return apiSuccess({
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

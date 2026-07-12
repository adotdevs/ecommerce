import { NextRequest } from "next/server";
import { deepSearchProducts } from "@/lib/search/products";
import { connectDB } from "@/lib/db/mongoose";
import { apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const category = searchParams.get("category") ?? undefined;
  const brand = searchParams.get("brand") ?? undefined;
  const minPrice = searchParams.get("minPrice")
    ? parseFloat(searchParams.get("minPrice")!)
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? parseFloat(searchParams.get("maxPrice")!)
    : undefined;

  const filter: Record<string, unknown> = { status: "published" };
  if (category) filter.categoryNames = category;
  if (brand) filter.brandName = brand;
  if (minPrice !== undefined || maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (minPrice !== undefined) price.$gte = minPrice;
    if (maxPrice !== undefined) price.$lte = maxPrice;
    filter["pricing.price"] = price;
  }

  const result = await deepSearchProducts(q, filter, page, limit);

  return apiSuccess({
    ...result,
    source: result.source ?? "fallback",
    enhancedQuery: result.enhancedQuery,
  });
}

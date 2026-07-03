import { NextRequest } from "next/server";
import { atlasSearchProducts, searchSuggestions } from "@/lib/search/products";
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

  const result = await atlasSearchProducts(
    q,
    { category, brand, minPrice, maxPrice },
    page,
    limit
  );

  return apiSuccess(result);
}

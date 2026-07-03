import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  lookupProductByLink,
  lookupCategoryByLink,
} from "@/lib/cms/resolve-links";

export const GET = withAuth(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get("q");
  const type = request.nextUrl.searchParams.get("type") ?? "product";

  if (!q?.trim()) return apiError("Query required", 400);

  await connectDB();

  if (type === "category") {
    const category = await lookupCategoryByLink(q);
    if (!category) return apiError("Category not found", 404);
    return apiSuccess({
      name: category.name,
      slug: category.slug,
      image: category.image,
    });
  }

  const product = await lookupProductByLink(q);
  if (!product) return apiError("Product not found", 404);

  return apiSuccess({
    name: product.name,
    slug: product.slug,
    image: product.media?.[0]?.url,
    featured: product.featured,
  });
}, PERMISSIONS.CMS_READ);

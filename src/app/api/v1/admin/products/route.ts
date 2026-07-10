import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { productSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  normalizeMedia,
  resolveBrandFields,
  resolveCategoryFields,
} from "@/lib/admin/product-helpers";

export const GET = withAuth(async (request: NextRequest) => {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const featured = searchParams.get("featured");
  const isNewArrival = searchParams.get("isNewArrival");
  const onSale = searchParams.get("onSale");

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (featured === "1") filter.featured = true;
  if (isNewArrival === "1") filter.isNewArrival = true;
  if (onSale === "1") {
    filter.$and = [
      { "pricing.compareAtPrice": { $exists: true, $gt: 0 } },
      { $expr: { $gt: ["$pricing.compareAtPrice", "$pricing.price"] } },
    ];
  }
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { sku: { $regex: q, $options: "i" } },
      { slug: { $regex: q, $options: "i" } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return apiSuccess({ products, pagination: { page, limit, total } });
}, PERMISSIONS.PRODUCTS_READ);

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return apiError(`${field}${issue.message}`);
    }

    const { categoryIds, brandId, media, weight, dimensions, ...rest } = parsed.data;
    const slug = rest.slug ?? slugify(rest.name);

    const [categoryFields, brandFields] = await Promise.all([
      resolveCategoryFields(categoryIds ?? []),
      resolveBrandFields(brandId ?? undefined),
    ]);

    const product = await Product.create({
      ...rest,
      slug,
      weight: weight ?? undefined,
      dimensions: dimensions ?? undefined,
      media: normalizeMedia(media),
      ...categoryFields,
      ...brandFields,
      pricing: {
        ...rest.pricing,
        compareAtPrice: rest.pricing.compareAtPrice ?? undefined,
      },
    });
    return apiSuccess(product, 201);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error && err.message.includes("duplicate")
        ? "SKU or slug already exists"
        : "Failed to create product";
    return apiError(message, 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

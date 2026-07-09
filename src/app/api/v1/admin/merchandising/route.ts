import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";

const merchandisingUpdateSchema = z.object({
  productId: z.string().min(1),
  featured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  compareAtPrice: z.number().optional().nullable(),
});

export const GET = withAuth(async (request: NextRequest) => {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");

  const onSaleFilter = {
    $and: [
      { "pricing.compareAtPrice": { $exists: true, $gt: 0 } },
      { $expr: { $gt: ["$pricing.compareAtPrice", "$pricing.price"] } },
    ],
  };

  const baseSelect =
    "name slug sku pricing status inventory featured isNewArrival media categoryNames";

  if (section === "bestsellers") {
    const products = await Product.find({ featured: true })
      .select(baseSelect)
      .sort({ "inventory.stock": -1, createdAt: -1 })
      .limit(100)
      .lean();
    return apiSuccess({ products, count: products.length });
  }

  if (section === "new-arrivals") {
    const products = await Product.find({ isNewArrival: true })
      .select(baseSelect)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return apiSuccess({ products, count: products.length });
  }

  if (section === "deals") {
    const products = await Product.find(onSaleFilter)
      .select(baseSelect)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return apiSuccess({ products, count: products.length });
  }

  const [bestsellers, newArrivals, deals] = await Promise.all([
    Product.countDocuments({ featured: true, status: "published" }),
    Product.countDocuments({ isNewArrival: true, status: "published" }),
    Product.countDocuments({ status: "published", ...onSaleFilter }),
  ]);

  return apiSuccess({
    counts: { bestsellers, newArrivals, deals },
  });
}, PERMISSIONS.PRODUCTS_READ);

export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = merchandisingUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { productId, featured, isNewArrival, compareAtPrice } = parsed.data;
    const update: Record<string, unknown> = {};

    if (featured !== undefined) update.featured = featured;
    if (isNewArrival !== undefined) update.isNewArrival = isNewArrival;
    if (compareAtPrice !== undefined) {
      update["pricing.compareAtPrice"] = compareAtPrice ?? undefined;
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { $set: update },
      { new: true }
    )
      .select("name slug featured isNewArrival pricing")
      .lean();

    if (!product) return apiError("Product not found", 404);
    return apiSuccess(product);
  } catch {
    return apiError("Failed to update merchandising", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

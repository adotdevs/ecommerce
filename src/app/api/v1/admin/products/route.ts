import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { productSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { apiSuccess, apiError } from "@/lib/api/response";

export const GET = withAuth(async (request: NextRequest) => {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(),
  ]);

  return apiSuccess({ products, pagination: { page, limit, total } });
}, PERMISSIONS.PRODUCTS_READ);

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const slug = parsed.data.slug ?? slugify(parsed.data.name);
    const product = await Product.create({ ...parsed.data, slug });
    return apiSuccess(product, 201);
  } catch (err) {
    console.error(err);
    return apiError("Failed to create product", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

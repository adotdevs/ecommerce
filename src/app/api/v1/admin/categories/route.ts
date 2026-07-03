import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Category } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { categorySchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET() {
  await connectDB();
  const categories = await Category.find().sort({ sortOrder: 1 }).lean();
  return apiSuccess(categories);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const slug = parsed.data.slug ?? slugify(parsed.data.name);
    const category = await Category.create({ ...parsed.data, slug });
    return apiSuccess(category, 201);
  } catch {
    return apiError("Failed to create category", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

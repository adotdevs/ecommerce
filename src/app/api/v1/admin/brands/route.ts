import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Brand } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { brandSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET() {
  await connectDB();
  const brands = await Brand.find().sort({ name: 1 }).lean();
  return apiSuccess(brands);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = brandSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const slug = parsed.data.slug ?? slugify(parsed.data.name);
    const brand = await Brand.create({ ...parsed.data, slug });
    return apiSuccess(brand, 201);
  } catch {
    return apiError("Failed to create brand", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

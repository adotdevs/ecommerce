import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Category, Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { categorySchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { apiSuccess, apiError } from "@/lib/api/response";

async function ensureUniqueCategorySlug(base: string): Promise<string> {
  const root = slugify(base) || "category";
  let candidate = root;
  let attempt = 0;
  while (await Category.exists({ slug: candidate })) {
    attempt += 1;
    candidate =
      attempt < 20
        ? `${root}-${attempt}`
        : `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return candidate.slice(0, 120);
}

function mongoErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Failed to create category";
  const e = err as { code?: number; message?: string; name?: string };
  if (e.code === 11000) {
    return "A category with this slug already exists. Choose a different name or slug.";
  }
  if (e.name === "ValidationError" || e.name === "CastError") {
    return e.message || "Invalid category data";
  }
  return e.message || "Failed to create category";
}

export async function GET() {
  await connectDB();
  const categories = await Category.find().sort({ sortOrder: 1 }).lean();

  const productCounts = await Product.aggregate([
    { $unwind: "$categoryIds" },
    { $group: { _id: "$categoryIds", count: { $sum: 1 } } },
  ]);
  const countById = new Map(
    productCounts.map((r) => [String(r._id), r.count as number])
  );

  const enriched = categories.map((c) => ({
    ...c,
    productCount: countById.get(String(c._id)) ?? 0,
  }));

  return apiSuccess(enriched);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { name, parentId, description, image, sortOrder, seo } = parsed.data;
    const slug = await ensureUniqueCategorySlug(
      parsed.data.slug || slugify(name)
    );

    const category = await Category.create({
      name,
      slug,
      ...(parentId ? { parentId } : {}),
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
      sortOrder: sortOrder ?? 0,
      ...(seo ? { seo } : {}),
    });

    return apiSuccess(category.toObject(), 201);
  } catch (err) {
    return apiError(mongoErrorMessage(err), 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

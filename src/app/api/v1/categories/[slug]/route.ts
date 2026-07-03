import { connectDB } from "@/lib/db/mongoose";
import { Category, Product } from "@/models";
import { apiSuccess, apiNotFound } from "@/lib/api/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  await connectDB();
  const { slug } = await params;
  const category = await Category.findOne({ slug }).lean();
  if (!category) return apiNotFound();

  const products = await Product.find({
    status: "published",
    categoryIds: category._id,
  })
    .limit(24)
    .lean();

  return apiSuccess({ category, products });
}

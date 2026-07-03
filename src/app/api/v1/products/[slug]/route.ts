import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { apiSuccess, apiNotFound } from "@/lib/api/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  await connectDB();
  const { slug } = await params;
  const product = await Product.findOne({ slug, status: "published" }).lean();
  if (!product) return apiNotFound("Product not found");

  const related = await Product.find({
    _id: { $ne: product._id },
    status: "published",
    categoryIds: { $in: product.categoryIds },
  })
    .limit(4)
    .lean();

  return apiSuccess({ product, related });
}
